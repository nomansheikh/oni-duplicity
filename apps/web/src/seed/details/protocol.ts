import type { SeedDetail } from './types.ts'

/** Main thread to worker: regenerate this coordinate in full. */
export interface DescribeMessage {
  type: 'describe'
  id: number
  coordinate: string
}

export type DescribeReply =
  | { type: 'detail'; id: number; detail: SeedDetail }
  | { type: 'error'; id: number; message: string }
