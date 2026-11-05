export class Reader {
  private readonly view: DataView
  private readonly bytes: Uint8Array
  pos: number
  constructor(bytes: Uint8Array, pos: number) {
    this.bytes = bytes
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    this.pos = pos
  }
  int(): number {
    const v = this.view.getInt32(this.pos, true)
    this.pos += 4
    return v
  }
  uint(): number {
    const v = this.view.getUint32(this.pos, true)
    this.pos += 4
    return v
  }
  float(): number {
    const v = this.view.getFloat32(this.pos, true)
    this.pos += 4
    return v
  }
  string(): string {
    const length = this.int()
    if (length < 0 || length > 256 || this.pos + length > this.bytes.length) {
      throw new Error('bad string')
    }
    const text = new TextDecoder().decode(this.bytes.subarray(this.pos, this.pos + length))
    this.pos += length
    return text
  }
}

/** Where a length-prefixed type name starts in the bytes, or -1. */
export function findName(bytes: Uint8Array, name: string, from = 0): number {
  const needle = new TextEncoder().encode(name)
  const prefix = needle.length
  outer: for (let i = from + 4; i + prefix <= bytes.length; i++) {
    for (let j = 0; j < prefix; j++) if (bytes[i + j] !== needle[j]) continue outer
    const view = new DataView(bytes.buffer, bytes.byteOffset + i - 4, 4)
    if (view.getInt32(0, true) === prefix) return i + prefix
  }
  return -1
}

/** Reads the `[length][hash][...]` configuration blob start; null if the layout differs. */
export function configuration(
  r: Reader,
  length: number,
  rolls: number,
): { hash: number; rolls: number[] } | null {
  if (r.int() !== length || r.int() !== 4) return null
  const hash = r.int()
  return { hash, rolls: Array.from({ length: rolls }, () => r.float()) }
}

export function readInstance(bytes: Uint8Array, name: string): Reader | null {
  const end = findName(bytes, name)
  if (end < 0) return null
  const r = new Reader(bytes, end)
  if (r.int() !== -1) return null
  return r
}
