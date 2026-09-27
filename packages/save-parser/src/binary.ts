const decoder = new TextDecoder('utf-8')
const encoder = new TextEncoder()

export class ParseError extends Error {
  readonly offset: number
  readonly context: string

  constructor(message: string, offset: number, context = '') {
    super(`${message} (at byte ${offset}${context ? `, in ${context}` : ''})`)
    this.name = 'ParseError'
    this.offset = offset
    this.context = context
  }
}

/** Little-endian cursor over a byte array. Every read is bounds-checked. */
export class Reader {
  readonly bytes: Uint8Array
  readonly view: DataView
  pos = 0
  /** Human-readable location used in error messages, e.g. `Minion > MinionIdentity`. */
  context = ''

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }

  get remaining(): number {
    return this.bytes.length - this.pos
  }

  fail(message: string): never {
    throw new ParseError(message, this.pos, this.context)
  }

  private need(n: number): void {
    if (n < 0 || this.pos + n > this.bytes.length) {
      this.fail(`Unexpected end of data: needed ${n} bytes, ${this.remaining} left`)
    }
  }

  u8(): number {
    this.need(1)
    return this.bytes[this.pos++]!
  }

  i8(): number {
    this.need(1)
    return this.view.getInt8(this.pos++)
  }

  i16(): number {
    this.need(2)
    const v = this.view.getInt16(this.pos, true)
    this.pos += 2
    return v
  }

  u16(): number {
    this.need(2)
    const v = this.view.getUint16(this.pos, true)
    this.pos += 2
    return v
  }

  i32(): number {
    this.need(4)
    const v = this.view.getInt32(this.pos, true)
    this.pos += 4
    return v
  }

  u32(): number {
    this.need(4)
    const v = this.view.getUint32(this.pos, true)
    this.pos += 4
    return v
  }

  i64(): bigint {
    this.need(8)
    const v = this.view.getBigInt64(this.pos, true)
    this.pos += 8
    return v
  }

  u64(): bigint {
    this.need(8)
    const v = this.view.getBigUint64(this.pos, true)
    this.pos += 8
    return v
  }

  f32(): number {
    this.need(4)
    const v = this.view.getFloat32(this.pos, true)
    this.pos += 4
    return v
  }

  f64(): number {
    this.need(8)
    const v = this.view.getFloat64(this.pos, true)
    this.pos += 8
    return v
  }

  /** A view into the source bytes (no copy). */
  bytesView(n: number): Uint8Array {
    this.need(n)
    const view = this.bytes.subarray(this.pos, this.pos + n)
    this.pos += n
    return view
  }

  /** Klei string: int32 byte length (-1 for null) followed by UTF-8. */
  string(): string | null {
    const length = this.i32()
    if (length === -1) return null
    if (length < 0) this.fail(`Invalid string length ${length}`)
    return decoder.decode(this.bytesView(length))
  }

  /** A non-null Klei string. */
  name(): string {
    const value = this.string()
    if (value === null) this.fail('Expected a name, got null')
    return value
  }

  /** Fixed-length ASCII, e.g. the `KSAV` marker. */
  chars(n: number): string {
    return String.fromCharCode(...this.bytesView(n))
  }
}

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
