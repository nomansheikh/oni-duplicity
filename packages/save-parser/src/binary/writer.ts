const encoder = new TextEncoder()

/** Growable little-endian writer with back-patched length prefixes. */
export class Writer {
  private buf: Uint8Array
  private view: DataView
  pos = 0

  constructor(initialSize = 1 << 20) {
    this.buf = new Uint8Array(initialSize)
    this.view = new DataView(this.buf.buffer)
  }

  private ensure(n: number): void {
    const needed = this.pos + n
    if (needed <= this.buf.length) return
    let size = this.buf.length * 2
    while (size < needed) size *= 2
    const next = new Uint8Array(size)
    next.set(this.buf.subarray(0, this.pos))
    this.buf = next
    this.view = new DataView(next.buffer)
  }

  u8(v: number): void {
    this.ensure(1)
    this.buf[this.pos++] = v
  }

  i8(v: number): void {
    this.ensure(1)
    this.view.setInt8(this.pos++, v)
  }

  i16(v: number): void {
    this.ensure(2)
    this.view.setInt16(this.pos, v, true)
    this.pos += 2
  }

  u16(v: number): void {
    this.ensure(2)
    this.view.setUint16(this.pos, v, true)
    this.pos += 2
  }

  i32(v: number): void {
    this.ensure(4)
    this.view.setInt32(this.pos, v, true)
    this.pos += 4
  }

  u32(v: number): void {
    this.ensure(4)
    this.view.setUint32(this.pos, v, true)
    this.pos += 4
  }

  i64(v: bigint): void {
    this.ensure(8)
    this.view.setBigInt64(this.pos, v, true)
    this.pos += 8
  }

  u64(v: bigint): void {
    this.ensure(8)
    this.view.setBigUint64(this.pos, v, true)
    this.pos += 8
  }

  f32(v: number): void {
    this.ensure(4)
    this.view.setFloat32(this.pos, v, true)
    this.pos += 4
  }

  f64(v: number): void {
    this.ensure(8)
    this.view.setFloat64(this.pos, v, true)
    this.pos += 8
  }

  bytes(v: Uint8Array): void {
    this.ensure(v.length)
    this.buf.set(v, this.pos)
    this.pos += v.length
  }

  string(v: string | null): void {
    if (v === null) {
      this.i32(-1)
      return
    }
    const encoded = encoder.encode(v)
    this.i32(encoded.length)
    this.bytes(encoded)
  }

  chars(v: string): void {
    for (let i = 0; i < v.length; i++) this.u8(v.charCodeAt(i))
  }

  /** Reserve an int32 length slot; returns its position for `endLength`. */
  beginLength(): number {
    const at = this.pos
    this.i32(0)
    return at
  }

  /** Patch the slot at `at` with the number of bytes written since `from` (default: right after the slot). */
  endLength(at: number, from = at + 4): void {
    this.view.setInt32(at, this.pos - from, true)
  }

  finish(): Uint8Array {
    return this.buf.slice(0, this.pos)
  }
}
