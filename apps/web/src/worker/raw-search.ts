import type { SaveGame } from '@oni-duplicity/save-parser'
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
