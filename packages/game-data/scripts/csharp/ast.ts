import type { Value } from './values.ts'

export type Node =
  | { k: 'lit'; v: Value }
  | { k: 'id'; name: string }
  | { k: 'member'; obj: Node; name: string }
  | { k: 'call'; callee: Node; args: Node[]; generic?: string }
  | { k: 'index'; obj: Node; idx: Node }
  | { k: 'new'; type: string; args?: Node[]; init?: InitItem[]; array: boolean }
  | { k: 'unary'; op: string; e: Node }
  | { k: 'bin'; op: string; l: Node; r: Node }
  | { k: 'cond'; c: Node; a: Node; b: Node }
  | { k: 'cast'; type: string; e: Node }
  | { k: 'lambda'; params: string[]; body: Node }
  | { k: 'unknown' }

export type InitItem = { name: string; value: Node } | { value: Node }

export const CAST_TYPES = new Set([
  'float',
  'int',
  'double',
  'long',
  'byte',
  'short',
  'uint',
  'string',
  'object',
  'SimHashes',
  'Tag',
])
