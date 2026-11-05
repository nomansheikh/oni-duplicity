import type { Recorder } from './recorder.ts'
import type { Loose } from './types.ts'

function isLong(v: Loose): boolean {
  return (
    v !== null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.keys(v).length === 3 &&
    typeof v.unsigned === 'boolean' &&
    typeof v.lower === 'number' &&
    typeof v.upper === 'number'
  )
}

function longToBigInt(v: { unsigned: boolean; lower: number; upper: number }): bigint {
  const raw = (BigInt(v.upper) << 32n) | BigInt.asUintN(32, BigInt(v.lower))
  return v.unsigned ? BigInt.asUintN(64, raw) : BigInt.asIntN(64, raw)
}

const isBytes = (v: unknown): v is ArrayBuffer | ArrayBufferView =>
  v instanceof ArrayBuffer || ArrayBuffer.isView(v)

export function toBytes(v: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (v instanceof Uint8Array) return v
  // A typed array or DataView must be read through its own window, not the whole buffer.
  if (ArrayBuffer.isView(v)) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength)
  return new Uint8Array(v)
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && Buffer.compare(a, b) === 0
}

const COLOUR_KEYS = ['r', 'g', 'b', 'a'] as const

function isColour(v: Loose): boolean {
  return (
    v !== null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.keys(v).sort().join() === 'a,b,g,r' &&
    Object.values(v).every((x) => typeof x === 'number')
  )
}

export function cmp(rec: Recorder, a: Loose, b: Loose, path: string): void {
  rec.compared++
  a ??= null
  b ??= null
  if (a === null || b === null) {
    if (a !== b) rec.real('value differs', path, a, b)
    return
  }
  if (isLong(a)) {
    if (typeof b !== 'bigint') return rec.real('int64 type mismatch', path, a, b)
    if (longToBigInt(a) === b)
      rec.record('representation', 'int64 {unsigned,lower,upper} vs bigint', path, 'equal')
    else rec.real('int64 differs', path, `${longToBigInt(a)}n`, `${b}n`)
    return
  }
  if (typeof a === 'bigint' || typeof b === 'bigint')
    return rec.real('unexpected bigint', path, a, b)
  if (isBytes(a) || isBytes(b)) {
    if (!isBytes(a) || !isBytes(b)) return rec.real('bytes vs non-bytes', path, a, b)
    if (!bytesEqual(toBytes(a), toBytes(b))) {
      return rec.real('bytes differ', path, `${a.byteLength} bytes`, `${b.byteLength} bytes`)
    }
    if (a.constructor !== b.constructor) {
      rec.record(
        'representation',
        `bytes ${a.constructor.name} vs ${b.constructor.name}`,
        path,
        'equal',
      )
    }
    return
  }
  if (isColour(a) && isColour(b) && !COLOUR_KEYS.every((k) => Object.is(a[k], b[k]))) {
    const same = COLOUR_KEYS.every((k) => Number.isInteger(b[k]) && Math.round(a[k] * 255) === b[k])
    if (same) rec.record('representation', 'colour float 0..1 vs byte 0..255', path, 'equal')
    else rec.real('colour differs', path, a, b)
    return
  }
  if (typeof a !== typeof b) return rec.real('type mismatch', path, a, b)
  if (typeof a === 'number') {
    if (!Object.is(a, b) && !(Number.isNaN(a) && Number.isNaN(b)))
      rec.real('number differs', path, a, b)
    return
  }
  if (typeof a !== 'object') {
    if (a !== b) rec.real('primitive differs', path, a, b)
    return
  }
  if (Array.isArray(a) !== Array.isArray(b)) return rec.real('array vs object', path, a, b)
  if (Array.isArray(a)) {
    if (a.length !== b.length) return rec.real('array length differs', path, a.length, b.length)
    for (let i = 0; i < a.length; i++) cmp(rec, a[i], b[i], `${path}[${i}]`)
    return
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    const inA = a[k] !== undefined
    const inB = b[k] !== undefined
    if (inA && inB) cmp(rec, a[k], b[k], `${path}.${k}`)
    else if (inA) rec.real('key only in oracle', `${path}.${k}`, a[k], undefined)
    else if (inB) rec.real('key only in ours', `${path}.${k}`, undefined, b[k])
  }
}
