// The impactor's state machines are saved as one opaque blob (`StateMachineController`). Each
// machine is `[nameLen][name][-1][stateLen][state][dataLen]`, then its own `[Serialize]` fields,
// then `[paramCount]` and the parameters. Only two machines are read, anchored by their type name,
// and every length is range-checked, so an unfamiliar blob reads as "unknown" instead of wrong.

const decoder = new TextDecoder('latin1')

function indexOfAscii(bytes: Uint8Array, text: string): number {
  const needle = Array.from(text, (c) => c.charCodeAt(0))
  outer: for (let i = 0; i + needle.length <= bytes.length; i++) {
    for (let j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer
    return i
  }
  return -1
}

interface MachineCursor {
  view: DataView
  /** Offset of the first byte after `[dataLen]`, i.e. the machine's own serialized fields. */
  fields: number
}

/** Finds `[nameLen][name][-1][stateLen][state][dataLen]` for a state machine instance type. */
function findMachine(bytes: Uint8Array, typeName: string): MachineCursor | null {
  const at = indexOfAscii(bytes, typeName)
  if (at < 4) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getInt32(at - 4, true) !== typeName.length) return null
  let cursor = at + typeName.length
  if (cursor + 12 > bytes.length || view.getInt32(cursor, true) !== -1) return null
  const stateLength = view.getInt32(cursor + 4, true)
  if (stateLength < 0 || stateLength > 256) return null
  cursor += 8 + stateLength
  if (cursor + 4 > bytes.length) return null
  return { view, fields: cursor + 4 }
}

export interface TravelFields {
  /** Absolute byte offset of the three fields. */
  at: number
  destinationWorldId: number
  /** `ClusterMapLargeImpactor.Instance.ArrivalTime`, in seconds. */
  arrivalTime: number
  /** `ClusterMapLargeImpactor.Instance.Speed`, in hexes per 600 s. */
  speed: number
}

/** `[Serialize] int DestinationWorldID; float ArrivalTime; float Speed` of `ClusterMapLargeImpactor.Instance`. */
export function readTravel(bytes: Uint8Array): TravelFields | null {
  const machine = findMachine(bytes, 'ClusterMapLargeImpactor+Instance')
  if (!machine || machine.fields + 12 > bytes.length) return null
  const at = machine.fields
  const destinationWorldId = machine.view.getInt32(at, true)
  const arrivalTime = machine.view.getFloat32(at + 4, true)
  const speed = machine.view.getFloat32(at + 8, true)
  if (destinationWorldId < 0 || destinationWorldId > 10_000) return null
  if (!Number.isFinite(arrivalTime) || arrivalTime <= 0) return null
  if (!Number.isFinite(speed) || speed <= 0) return null
  return { at, destinationWorldId, arrivalTime, speed }
}

/** `LargeImpactorStatus.sm.Health`, an `IntParameter` (max `HEALTH = 1000` in LargeImpactorConfig). */
export const IMPACTOR_MAX_HEALTH = 1000

export function readHealth(bytes: Uint8Array): number | null {
  const machine = findMachine(bytes, 'LargeImpactorStatus+Instance')
  if (!machine) return null
  const { view } = machine
  // `LargeImpactorStatus.Instance` has no fields of its own, so the parameter count follows.
  let cursor = machine.fields
  if (cursor + 4 > bytes.length) return null
  const count = view.getInt32(cursor, true)
  cursor += 4
  if (count < 1 || count > 16) return null
  for (let i = 0; i < count; i++) {
    if (cursor + 8 > bytes.length) return null
    const size = view.getInt32(cursor, true)
    const typeLength = view.getInt32(cursor + 4, true)
    if (size < 8 || typeLength < 0 || cursor + 4 + size > bytes.length) return null
    const nameLength = view.getInt32(cursor + 8 + typeLength, true)
    const nameAt = cursor + 12 + typeLength
    if (nameLength < 0 || nameAt + nameLength > cursor + 4 + size) return null
    const name = decoder.decode(bytes.subarray(nameAt, nameAt + nameLength))
    const valueAt = nameAt + nameLength
    if (name === 'Health' && cursor + 4 + size - valueAt === 4) {
      const health = view.getInt32(valueAt, true)
      return health >= 0 && health <= IMPACTOR_MAX_HEALTH ? health : null
    }
    cursor += 4 + size
  }
  return null
}
