import { ParseError } from './parse-error.ts'

const decoder = new TextDecoder('utf-8')

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
