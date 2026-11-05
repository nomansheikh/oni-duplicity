import type { Loose } from './types.ts'

function int32(n: number): Buffer {
  const b = Buffer.alloc(4)
  b.writeInt32LE(n)
  return b
}

function kleiString(s: string | null): Buffer {
  if (s === null) return int32(-1)
  const encoded = Buffer.from(s, 'utf8')
  return Buffer.concat([int32(encoded.length), encoded])
}

/** Re-encodes the oracle's decoded StateMachineController to the bytes it was read from. */
export function encodeStateMachineController(x: Loose): Buffer {
  const parts: Buffer[] = [int32(x.serializerVersion)]
  if (!x.stateMachines) {
    parts.push(int32(x.unparsed.byteLength), Buffer.from(x.unparsed))
    return Buffer.concat(parts)
  }
  // Serializer 11 and 20+ carry a type suffix per machine.
  const hasSuffix = x.serializerVersion < 20 ? x.serializerVersion === 11 : true
  const body: Buffer[] = [int32(x.stateMachines.length)]
  for (const m of x.stateMachines) {
    body.push(int32(m.leading), kleiString(m.type))
    if (hasSuffix) body.push(kleiString(m.typeSuffix))
    body.push(kleiString(m.currentState), int32(m.data.byteLength), Buffer.from(m.data))
  }
  const bodyBuffer = Buffer.concat(body)
  parts.push(int32(bodyBuffer.length), bodyBuffer)
  return Buffer.concat(parts)
}
