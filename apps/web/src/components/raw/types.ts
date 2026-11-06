import type { RawEntry, RawPath } from '@/worker/model'

export const PAGE = 500
/** Pixels of indent per tree level. */
export const INDENT = 20

export const keyOf = (path: RawPath) => JSON.stringify(path)

export const isContainer = (entry: RawEntry) => entry.kind === 'object' || entry.kind === 'array'

/** Whole-tree search: wait this long after the last keystroke, show at most this many hits. */
export const SEARCH_DEBOUNCE = 350
export const SEARCH_LIMIT = 200

export type Row =
  | { type: 'entry'; entry: RawEntry; depth: number; parentCanAdd: boolean }
  | { type: 'more'; path: RawPath; depth: number; loaded: number; total: number }

export const KIND_STYLES: Record<string, string> = {
  object: 'text-fg-2',
  array: 'text-fg-2',
  string: 'text-good',
  number: 'text-info',
  bigint: 'text-info',
  boolean: 'text-gold',
  bytes: 'text-warn',
  null: 'text-fg-2',
}
