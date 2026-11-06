import type { SaveGame } from '@oni-duplicity/save-parser'
import { rawCanAdd } from './raw.ts'
import type { RawChildren, RawEntry, RawKind, RawPath } from './raw-view-types.ts'

function kindOf(value: unknown): RawKind {
  if (value === null || value === undefined) return 'null'
  if (value instanceof Uint8Array) return 'bytes'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'bigint') return 'bigint'
  if (typeof value === 'object') return 'object'
  return typeof value as 'string' | 'number' | 'boolean'
}

export function rawGet(save: SaveGame, path: RawPath): unknown {
  let node: unknown = save
  for (const key of path) {
    if (node === null || typeof node !== 'object') throw new Error(`No value at ${path.join('.')}`)
    node = (node as Record<string | number, unknown>)[key]
  }
  return node
}

export function rawParent(
  save: SaveGame,
  path: RawPath,
): { parent: Record<string | number, unknown>; key: string | number } {
  if (path.length === 0) throw new Error('Cannot edit the root')
  const parent = rawGet(save, path.slice(0, -1))
  if (parent === null || typeof parent !== 'object')
    throw new Error(`No value at ${path.join('.')}`)
  return { parent: parent as Record<string | number, unknown>, key: path[path.length - 1]! }
}

/** Keep the stored type when a primitive is edited (bigints stay bigints, floats stay numbers). */
export function coerce(current: unknown, value: string | number | boolean | null): unknown {
  switch (kindOf(current)) {
    case 'bigint':
      return BigInt(String(value))
    case 'number': {
      const n = Number(value)
      if (!Number.isFinite(n)) throw new Error(`${String(value)} is not a number`)
      return n
    }
    case 'boolean':
      return value === true || value === 'true'
    case 'string':
    case 'null':
      return value === null ? null : String(value)
    default:
      throw new Error('Only primitive values can be edited')
  }
}

/** Groups and behaviors carry a `name`; show it next to the index. */
function labelFor(value: unknown): string | undefined {
  if (kindOf(value) !== 'object') return undefined
  const name = (value as { name?: unknown }).name
  return typeof name === 'string' ? name : undefined
}

const hex = (bytes: Uint8Array) =>
  Array.from(bytes.subarray(0, 16), (b) => b.toString(16).padStart(2, '0')).join(' ') +
  (bytes.length > 16 ? ' …' : '')

export function rawChildren(save: SaveGame, path: RawPath, offset = 0, limit = 500): RawChildren {
  const node = rawGet(save, path)
  const pairs: [string | number, unknown][] =
    node instanceof Uint8Array
      ? []
      : Array.isArray(node)
        ? node.map((v, i) => [i, v])
        : node && typeof node === 'object'
          ? Object.entries(node)
          : []
  const entries = pairs.slice(offset, offset + limit).map(([key, value]): RawEntry => {
    const kind = kindOf(value)
    const entry: RawEntry = { key, path: [...path, key], kind }
    const label = labelFor(value)
    if (label) entry.label = label
    if (kind === 'array') {
      entry.size = (value as unknown[]).length
      entry.canAdd = rawCanAdd(save, entry.path)
    } else if (kind === 'object') entry.size = Object.keys(value as object).length
    else if (kind === 'bytes') {
      entry.size = (value as Uint8Array).length
      entry.value = hex(value as Uint8Array)
    } else if (kind === 'bigint') entry.value = String(value)
    else if (kind === 'null') entry.value = null
    else entry.value = value as string | number | boolean
    return entry
  })
  const result: RawChildren = { entries, total: pairs.length }
  if (Array.isArray(node) && rawCanAdd(save, path)) result.canAdd = true
  return result
}

/**
 * Every ancestor of `path` (the root first) with its children loaded far enough to include the
 * next step down, so the editor can open the whole route to a search result in one round trip.
 */
export function rawReveal(
  save: SaveGame,
  path: RawPath,
  page = 500,
): { path: RawPath; children: RawChildren }[] {
  const out: { path: RawPath; children: RawChildren }[] = []
  for (let depth = 0; depth < path.length; depth++) {
    const parent = path.slice(0, depth)
    const node = rawGet(save, parent)
    const key = path[depth]!
    const position = Array.isArray(node)
      ? Number(key)
      : node && typeof node === 'object'
        ? Object.keys(node).indexOf(String(key))
        : -1
    if (position < 0) throw new Error(`No value at ${path.join('.')}`)
    const limit = Math.ceil((position + 1) / page) * page
    out.push({ path: parent, children: rawChildren(save, parent, 0, limit) })
  }
  return out
}
