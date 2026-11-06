export type RawKind =
  | 'object'
  | 'array'
  | 'bytes'
  | 'string'
  | 'number'
  | 'boolean'
  | 'bigint'
  | 'null'

export type RawPath = (string | number)[]

export interface RawEntry {
  key: string | number
  /** Friendlier label, e.g. a group's prefab or a behavior's name. */
  label?: string
  path: RawPath
  kind: RawKind
  /** Children count for objects, arrays and byte arrays. */
  size?: number
  /** Arrays only: whether "add item" can build a valid new element (see `rawDefaultItem`). */
  canAdd?: boolean
  value?: string | number | boolean | null
}

export interface RawChildren {
  entries: RawEntry[]
  total: number
  /** Set when the node is an array that accepts a new item. */
  canAdd?: boolean
}
