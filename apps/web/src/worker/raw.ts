import {
  IS_VALUE_TYPE,
  TYPE_CODE_MASK,
  TypeCode,
  type SaveGame,
  type Template,
  type TypeInfo,
} from '@oni-duplicity/save-parser'
import type { RawKind, RawPath } from './model.ts'

// --- Whole-tree search ------------------------------------------------------------------

export interface RawSearchOptions {
  /** Case-insensitive text. Matches key names, and the full path when it looks like one. */
  query: string
  /** Also match primitive values (strings, numbers, booleans, bigints). */
  values?: boolean
  /** Stop after this many matches. */
  limit?: number
}

export interface RawMatch {
  path: RawPath
  kind: RawKind
  /** What matched; a node matching more than one way reports the first of key, path, value. */
  by: 'key' | 'path' | 'value'
  /** The primitive value, as text (long strings are cut). */
  value?: string
}

export interface RawSearchResult {
  matches: RawMatch[]
  /** More matches exist than `limit`. */
  truncated: boolean
  /** Nodes visited. */
  scanned: number
  ms: number
}

/** Lets the caller stop a search and gives the worker's message loop a turn between slices. */
export interface SearchControl {
  cancelled(): boolean
  yield(): Promise<void>
}

/** Work this long (ms) before handing the thread back so a cancel message can arrive. */
const SLICE_MS = 20
/** Check the clock every this many nodes. */
const CHECK_EVERY = 2048

const kindOfValue = (value: unknown): RawKind => {
  if (value === null || value === undefined) return 'null'
  if (value instanceof Uint8Array) return 'bytes'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'bigint') return 'bigint'
  if (typeof value === 'object') return 'object'
  return typeof value as 'string' | 'number' | 'boolean'
}

const formatKeyPath = (path: RawPath): string =>
  path
    .map((part, i) => (typeof part === 'number' ? `[${part}]` : i === 0 ? part : `.${part}`))
    .join('')

/**
 * Walks every node of the save in tree order (depth first, the order the raw editor shows) and
 * collects the first `limit` matches. Byte arrays are leaves: they match by key only.
 *
 * - Key: the node's own key contains the text. Array indices have no key name.
 * - Path: only tried when the text contains `.`, `[` or `]`, because a plain word would otherwise
 *   match everything below a key of that name, burying the key match itself.
 * - Value: only with `values`, for primitives.
 *
 * Async so a 40 MB save never blocks the worker for more than one slice.
 */
export async function rawSearch(
  save: SaveGame,
  options: RawSearchOptions,
  control?: SearchControl,
): Promise<RawSearchResult> {
  const started = performance.now()
  const needle = options.query.trim().toLowerCase()
  const limit = options.limit ?? 200
  const matches: RawMatch[] = []
  if (!needle) return { matches, truncated: false, scanned: 0, ms: 0 }

  const byPath = /[.[\]]/.test(needle)
  const byValue = options.values === true
  // Converting every number to text is the slow part of a value search. A number's text only
  // holds digits and `.+-e` (or Infinity/NaN), so skip the conversion for any other query.
  const numbersCanMatch =
    /^[\d.+\-e]+$/.test(needle) || 'infinity'.includes(needle) || 'nan'.includes(needle)
  const boolsCanMatch = 'true'.includes(needle) || 'false'.includes(needle)
  const path: RawPath = []
  let scanned = 0
  let truncated = false
  let sliceStart = started

  type Frame = { node: object; keys: string[] | null; length: number; at: number }
  const frame = (node: object): Frame => {
    const isArray = Array.isArray(node)
    const keys = isArray ? null : Object.keys(node)
    return { node, keys, length: isArray ? (node as unknown[]).length : keys!.length, at: 0 }
  }
  const stack: Frame[] = [frame(save as unknown as object)]

  const matchesValue = (value: unknown, kind: RawKind): boolean => {
    switch (kind) {
      case 'string':
        return (value as string).toLowerCase().includes(needle)
      case 'number':
      case 'bigint':
        return numbersCanMatch && String(value).includes(needle)
      case 'boolean':
        return boolsCanMatch && String(value).includes(needle)
      default:
        return false
    }
  }

  const visit = (key: string | number, value: unknown): boolean => {
    scanned++
    path.push(key)
    const kind = kindOfValue(value)
    let by: RawMatch['by'] | null = null
    if (typeof key === 'string' && key.toLowerCase().includes(needle)) by = 'key'
    else if (byPath && formatKeyPath(path).toLowerCase().includes(needle)) by = 'path'
    else if (byValue && matchesValue(value, kind)) by = 'value'
    if (by) {
      if (matches.length >= limit) {
        truncated = true
        path.pop()
        return false
      }
      const match: RawMatch = { path: [...path], kind, by }
      if (kind === 'string') {
        const text = value as string
        match.value = text.length > 120 ? `${text.slice(0, 120)}…` : text
      } else if (kind !== 'object' && kind !== 'array' && kind !== 'bytes' && kind !== 'null') {
        match.value = String(value)
      }
      matches.push(match)
    }
    if (kind === 'object' || kind === 'array') {
      stack.push(frame(value as object))
    } else {
      path.pop()
    }
    return true
  }

  while (stack.length > 0) {
    const top = stack[stack.length - 1]!
    if (top.at >= top.length) {
      stack.pop()
      // The root frame has no key on the path.
      if (stack.length > 0) path.pop()
      continue
    }
    const index = top.at++
    const key = top.keys ? top.keys[index]! : index
    const value = (top.node as Record<string | number, unknown>)[key]
    if (!visit(key, value)) break
    if (scanned % CHECK_EVERY === 0 && control) {
      if (control.cancelled()) throw new Error('cancelled')
      if (performance.now() - sliceStart > SLICE_MS) {
        await control.yield()
        if (control.cancelled()) throw new Error('cancelled')
        sliceStart = performance.now()
      }
    }
  }
  return { matches, truncated, scanned, ms: performance.now() - started }
}

// --- Adding array items -----------------------------------------------------------------

const templateMaps = new WeakMap<Template[], Map<string, Template>>()

function templatesOf(save: SaveGame): Map<string, Template> {
  let map = templateMaps.get(save.templates)
  if (!map) {
    map = new Map(save.templates.map((t) => [t.name, t]))
    templateMaps.set(save.templates, map)
  }
  return map
}

// Root templates, as named by the parser.
const ROOTS: Record<string, string> = {
  world: 'Klei.SaveFileRoot',
  settings: 'Game+Settings',
  gameData: 'Game+GameSaveData',
}

const COLLECTIONS: number[] = [TypeCode.Array, TypeCode.List, TypeCode.HashSet, TypeCode.Queue]
const codeOf = (type: TypeInfo) => type.info & TYPE_CODE_MASK
const userType = (name: string): TypeInfo => ({ info: TypeCode.UserDefined, templateName: name })

/** The declared type of the value at `path`, or null when the save's templates do not cover it. */
function typeAt(save: SaveGame, path: RawPath): TypeInfo | null {
  const templates = templatesOf(save)
  let type: TypeInfo
  let rest: RawPath
  const [head] = path
  if (typeof head === 'string' && head in ROOTS) {
    type = userType(ROOTS[head]!)
    rest = path.slice(1)
  } else if (head === 'gameObjects') {
    // gameObjects[g].gameObjects[i].behaviors[j].templateData: typed by the behavior's name.
    const [, g, sub, i, listName, j, field] = path
    if (
      typeof g !== 'number' ||
      sub !== 'gameObjects' ||
      typeof i !== 'number' ||
      listName !== 'behaviors' ||
      typeof j !== 'number' ||
      field !== 'templateData'
    )
      return null
    const behavior = save.gameObjects[g]?.gameObjects[i]?.behaviors[j]
    if (!behavior?.templateData) return null
    type = userType(behavior.name)
    rest = path.slice(7)
  } else {
    return null
  }
  for (const part of rest) {
    const code = codeOf(type)
    if (code === TypeCode.UserDefined) {
      const template = templates.get(type.templateName!)
      const member = [...(template?.fields ?? []), ...(template?.properties ?? [])].find(
        (m) => m.name === part,
      )
      if (!member) return null
      type = member.type
    } else if (COLLECTIONS.includes(code)) {
      if (typeof part !== 'number') return null
      type = type.subTypes![0]!
    } else if (code === TypeCode.Pair) {
      if (part !== 'key' && part !== 'value') return null
      type = type.subTypes![part === 'key' ? 0 : 1]!
    } else {
      return null
    }
  }
  return type
}

/** The type has no value we can construct (a template the save does not define). */
class NoDefault extends Error {}

/**
 * A zero value of a declared type: what the game writes for a freshly constructed one.
 * Throws `NoDefault` when any type reachable from it has no template in the save (`System.Guid`,
 * `Ref`1[[...]]`, `CellEventInstance` and others are written by hand, not from a template), since
 * the writer would fail on the new item and the whole save could no longer be written.
 */
function defaultOf(save: SaveGame, type: TypeInfo, depth = 0): unknown {
  const code = codeOf(type)
  switch (code) {
    case TypeCode.UserDefined: {
      const template = templatesOf(save).get(type.templateName!)
      if (!template) throw new NoDefault(type.templateName)
      if (depth > 6) {
        // A reference type that nests itself forever is stored as null (length -1) instead.
        if (type.info & IS_VALUE_TYPE) throw new NoDefault(type.templateName)
        return null
      }
      const out: Record<string, unknown> = {}
      for (const m of [...template.fields, ...template.properties]) {
        out[m.name] = defaultOf(save, m.type, depth + 1)
      }
      return out
    }
    case TypeCode.Int64:
    case TypeCode.UInt64:
      return 0n
    case TypeCode.Boolean:
      return false
    case TypeCode.String:
      return ''
    case TypeCode.Vector2I:
    case TypeCode.Vector2:
      return { x: 0, y: 0 }
    case TypeCode.Vector3:
      return { x: 0, y: 0, z: 0 }
    case TypeCode.Colour:
      return { r: 0, g: 0, b: 0, a: 0 }
    case TypeCode.Pair:
      return {
        key: defaultOf(save, type.subTypes![0]!, depth + 1),
        value: defaultOf(save, type.subTypes![1]!, depth + 1),
      }
    case TypeCode.Dictionary:
      return []
    default:
      if (COLLECTIONS.includes(code)) {
        return codeOf(type.subTypes![0]!) === TypeCode.Byte ? new Uint8Array(0) : []
      }
      // Integers, floats and enumerations.
      return 0
  }
}

/**
 * The value "add item" appends to the array at `path`, taken from the save's own template
 * definitions, or null when the array's element type cannot be known or any type reachable from
 * it has no template in the save (the writer could not write the new item then).
 *
 * Only arrays reached through a template are offered: the world, settings and game data roots
 * and each behavior's template data. Elsewhere (the header JSON, extra data the parser decodes
 * by hand) the element type is a guess from siblings, and a wrong guess would write a save the
 * game cannot read. Byte arrays and dictionaries are not offered either: bytes are read-only in
 * the editor, and a dictionary entry needs a key that is not already used.
 */
export function rawDefaultItem(save: SaveGame, arrayPath: RawPath): { value: unknown } | null {
  const element = elementTypeOf(save, arrayPath)
  if (!element) return null
  try {
    return { value: defaultOf(save, element) }
  } catch (error) {
    if (error instanceof NoDefault) return null
    throw error
  }
}

// Whether a type can be defaulted depends only on the templates, so it is worth remembering:
// the editor asks once per array row it draws.
const feasible = new WeakMap<TypeInfo, boolean>()

/** Whether `rawDefaultItem` would offer an item, without building it. */
export function rawCanAdd(save: SaveGame, arrayPath: RawPath): boolean {
  const element = elementTypeOf(save, arrayPath)
  if (!element) return false
  let ok = feasible.get(element)
  if (ok === undefined) {
    ok = rawDefaultItem(save, arrayPath) !== null
    feasible.set(element, ok)
  }
  return ok
}

function elementTypeOf(save: SaveGame, arrayPath: RawPath): TypeInfo | null {
  let node: unknown = save
  for (const key of arrayPath) {
    if (node === null || typeof node !== 'object') return null
    node = (node as Record<string | number, unknown>)[key]
  }
  if (!Array.isArray(node)) return null
  const type = typeAt(save, arrayPath)
  if (!type || !COLLECTIONS.includes(codeOf(type))) return null
  const element = type.subTypes![0]!
  return codeOf(element) === TypeCode.Byte ? null : element
}

// --- Cancellable searches ---------------------------------------------------------------

/**
 * Runs searches by id and cancels them by id. Only a search that is running can be cancelled: a
 * cancel for an id that has not started, or has finished, does nothing, so it cannot leak into a
 * later search that happens to reuse the id.
 */
export function createSearchRunner(yieldToLoop: () => Promise<void>) {
  const running = new Map<number, { cancelled: boolean }>()
  return {
    async run(save: SaveGame, id: number, options: RawSearchOptions): Promise<RawSearchResult> {
      const state = { cancelled: false }
      running.set(id, state)
      try {
        return await rawSearch(save, options, {
          cancelled: () => state.cancelled,
          yield: yieldToLoop,
        })
      } finally {
        // A newer search may have taken over this id.
        if (running.get(id) === state) running.delete(id)
      }
    },
    cancel(id: number): void {
      const state = running.get(id)
      if (state) state.cancelled = true
    },
    /** Searches still running (for tests). */
    get active() {
      return running.size
    },
  }
}
