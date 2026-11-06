// Result shapes shared by the comparison modules.

export type Kind = 'representation' | 'known' | 'real'

export interface Entry {
  kind: Kind
  category: string
  /** Path pattern: indices and game-object names are collapsed. */
  pattern: string
  count: number
  /** First occurrence, with its full path and both values. */
  example: string
}

export interface Report {
  comparedValues: number
  entries: Entry[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Loose = any
/* eslint-enable @typescript-eslint/no-explicit-any */
