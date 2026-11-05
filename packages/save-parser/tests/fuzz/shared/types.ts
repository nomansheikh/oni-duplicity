export const CATEGORIES = [
  'file-truncate',
  'header',
  'templates',
  'compressed-body',
  'body-truncate',
  'body-preamble',
  'body-objects',
] as const
export type Category = (typeof CATEGORIES)[number]

/** Cases per category at FUZZ_SCALE=1. */
export const BASE_COUNTS: Record<Category, number> = {
  'file-truncate': 40,
  header: 80,
  templates: 100,
  'compressed-body': 40,
  'body-truncate': 40,
  'body-preamble': 100,
  'body-objects': 100,
}

export interface Edit {
  offset: number
  before: number
  after: number
}

/** One reproducible mutation. Offsets are relative to the target buffer of its category. */
export interface FuzzCase {
  name: string
  category: Category
  /** Keep only the first `truncateTo` bytes. */
  truncateTo?: number
  edits: Edit[]
}

export type Outcome = 'ok' | 'parse-error' | 'bug'

export interface CaseResult {
  case: FuzzCase
  outcome: Outcome
  /** For bugs: error class, `write:<class>`, `timeout`, `oom` or `crash`. */
  kind?: string
  message?: string
  stack?: string
  ms: number
}
