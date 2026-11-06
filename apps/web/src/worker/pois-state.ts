import { configuration, findName, readInstance, Reader } from './pois-reader.ts'

export interface HarvestState {
  hash: number
  capacityRoll: number
  rechargeRoll: number
  capacity: number
  /** Where `_poiCapacity` sits in the bytes, and where the `poiCapacity` parameter repeats it. */
  capacityAt: number
  parameterAt: number
}

export interface ArtifactState {
  state: string
  hash: number
  rechargeRoll: number
  charge: number
  artifactToHarvest: string
  harvests: number
}

export function readHarvestState(bytes: Uint8Array): HarvestState | null {
  try {
    const r = readInstance(bytes, 'HarvestablePOIStates+Instance')
    if (!r) return null
    r.string() // state name
    const instanceLength = r.int()
    const instanceStart = r.pos
    const c = configuration(r, 16, 2)
    if (!c) return null
    const capacityAt = r.pos
    const capacity = r.float()
    const [capacityRoll, rechargeRoll] = c.rolls as [number, number]
    // The state machine parameter holds the same float behind its length-prefixed name.
    const parameterAt = findName(bytes, 'poiCapacity', r.pos)
    if (parameterAt < 0) return null
    const copy = new Reader(bytes, parameterAt)
    if (copy.float() !== capacity) return null
    // The parameter must sit inside the instance the length prefix describes, so two unrelated
    // equal floats in a layout we do not know cannot pass.
    const instanceEnd = instanceStart + instanceLength
    if (instanceLength <= 0 || instanceEnd > bytes.length || parameterAt + 4 > instanceEnd) {
      return null
    }
    return { hash: c.hash, capacityRoll, rechargeRoll, capacity, capacityAt, parameterAt }
  } catch {
    return null
  }
}

/**
 * What follows the charge: the artifact to harvest (a string) and the number of harvests.
 * Saves from 7.33 write the string first; 7.37 and later write the count first, as the class
 * declares them. A string is told apart by its `artifact_` text or a null length of -1.
 */
function readTail(r: Reader): { artifactToHarvest: string; harvests: number } {
  const start = r.pos
  const first = r.int()
  if (first === -1) return { artifactToHarvest: '', harvests: r.int() }
  if (first > 0 && first <= 64) {
    r.pos = start
    const text = r.string()
    if (text.startsWith('artifact_')) return { artifactToHarvest: text, harvests: r.int() }
  }
  r.pos = start
  const harvests = r.int()
  const length = r.int()
  if (length === -1) return { artifactToHarvest: '', harvests }
  r.pos -= 4
  return { artifactToHarvest: r.string(), harvests }
}

export function readArtifactState(bytes: Uint8Array): ArtifactState | null {
  try {
    const r = readInstance(bytes, 'ArtifactPOIStates+Instance')
    if (!r) return null
    const state = r.string().replace(/^root\./, '')
    r.int() // instance length
    const c = configuration(r, 12, 1)
    if (!c) return null
    const charge = r.float()
    const { artifactToHarvest, harvests } = readTail(r)
    return {
      state,
      hash: c.hash,
      rechargeRoll: c.rolls[0]!,
      charge,
      artifactToHarvest,
      harvests,
    }
  } catch {
    return null
  }
}
