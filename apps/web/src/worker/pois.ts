import { findElement, hashString, humanize } from '@oni-duplicity/game-data'
import type { Behavior, GameObject, SaveGame } from '@oni-duplicity/save-parser'
import {
  artifactPoiTypes,
  defaultArtifactPoiType,
  harvestablePoiTypes,
  type ArtifactPoiType,
  type HarvestablePoiType,
} from '../lib/space-pois.ts'

// Spaced Out points of interest, read-only.
//
// A POI's location is plain template data (`m_location`), but its roll and its charge live in
// the `StateMachineController` extra bytes, which hold one serialized state machine instance per
// state machine on the object: `HarvestablePOIStates` and, for most harvestable POIs, an
// `ArtifactPOIStates` as well. Both are read by looking for the instance's type name and reading
// the fields behind it; anything that does not look as expected is left out rather than guessed.

export type RevealLevel = 'hidden' | 'peeked' | 'revealed'

export interface PoiView {
  id: string
  kind: 'harvestable' | 'artifact'
  /** The type ID, e.g. `SandyOreField`. */
  type: string
  name: string
  location: { r: number; q: number }
  /** Whether the starmap shows the POI, from the fog of war; unset when it could not be read. */
  reveal?: RevealLevel
  harvest?: {
    /** Kilograms in stock now and when full. */
    current: number
    max: number
    /** Seconds to refill from empty. */
    rechargeSeconds: number
    elements: { name: string; share: number }[]
  }
  artifact?: {
    /** The state machine state, e.g. `recharging`. */
    state: string
    /** 0 to 1. */
    charge: number
    /** Seconds until the POI produces its next artifact. */
    remainingSeconds: number
    harvests: number
    /** The artifact waiting on the starmap tile, if any. */
    waiting?: string
  }
}

class Reader {
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
function findName(bytes: Uint8Array, name: string, from = 0): number {
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
function configuration(
  r: Reader,
  length: number,
  rolls: number,
): { hash: number; rolls: number[] } | null {
  if (r.int() !== length || r.int() !== 4) return null
  const hash = r.int()
  return { hash, rolls: Array.from({ length: rolls }, () => r.float()) }
}

export interface HarvestState {
  hash: number
  capacityRoll: number
  rechargeRoll: number
  capacity: number
  /** Where `_poiCapacity` sits in the bytes, and where the `poiCapacity` parameter repeats it. */
  capacityAt: number
  parameterAt: number
}

interface ArtifactState {
  state: string
  hash: number
  rechargeRoll: number
  charge: number
  artifactToHarvest: string
  harvests: number
}

function readInstance(bytes: Uint8Array, name: string): Reader | null {
  const end = findName(bytes, name)
  if (end < 0) return null
  const r = new Reader(bytes, end)
  if (r.int() !== -1) return null
  return r
}

export function readHarvestState(bytes: Uint8Array): HarvestState | null {
  try {
    const r = readInstance(bytes, 'HarvestablePOIStates+Instance')
    if (!r) return null
    r.string() // state name
    r.int() // instance length
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

export interface FogLayout {
  /** Where the first of `count` reveal point floats starts. */
  valuesAt: number
  count: number
  points: Map<string, number>
}

/**
 * Reveal points per starmap cell, from the fog of war manager's state machine on the save game
 * object: `ClusterFogOfWarManager.m_revealPointsByCell`, written as all values and then all keys
 * (each key a length prefix of 8 and the two ints of an `AxialI`).
 */
export function readFog(bytes: Uint8Array): FogLayout | null {
  try {
    const r = readInstance(bytes, 'ClusterFogOfWarManager+Instance')
    if (!r) return null
    r.string()
    const instanceLength = r.int()
    const length = r.int()
    const count = r.int()
    if (length !== count * 16 || instanceLength !== length + 8) return null
    const valuesAt = r.pos
    const values = Array.from({ length: count }, () => r.float())
    const points = new Map<string, number>()
    for (let i = 0; i < count; i++) {
      if (r.int() !== 8) return null
      const cellR = r.int()
      const cellQ = r.int()
      points.set(`${cellR},${cellQ}`, values[i]!)
    }
    return { valuesAt, count, points }
  } catch {
    return null
  }
}

export const readRevealPoints = (bytes: Uint8Array) => readFog(bytes)?.points ?? null

export const POINTS_TO_REVEAL = 100

function revealLevel(
  points: Map<string, number> | null,
  r: number,
  q: number,
): RevealLevel | undefined {
  if (!points) return undefined
  const value = points.get(`${r},${q}`) ?? 0
  if (value >= POINTS_TO_REVEAL) return 'revealed'
  return value > 0 ? 'peeked' : 'hidden'
}

export const harvestableByHash = new Map(harvestablePoiTypes.map((t) => [hashString(t.id) | 0, t]))
const artifactByHash = new Map(
  [...artifactPoiTypes, defaultArtifactPoiType].map((t) => [hashString(t.id) | 0, t]),
)
export const harvestableByPrefab = new Map(
  harvestablePoiTypes.map((t) => [`HarvestableSpacePOI_${t.id}`, t]),
)
const artifactByPrefab = new Map(artifactPoiTypes.map((t) => [`ArtifactSpacePOI_${t.id}`, t]))

/** `MathUtil.ReRange(roll, 0, 1, min, max)` in single precision, as the game computes it. */
export const mix = (range: { min: number; max: number }, roll: number) =>
  Math.fround(Math.fround(roll * Math.fround(range.max - range.min)) + range.min)

function location(obj: GameObject, behaviorName: string): { r: number; q: number } | null {
  const loc = obj.behaviors.find((b) => b.name === behaviorName)?.templateData?.m_location as
    | { r: number; q: number }
    | undefined
  return loc && Number.isFinite(loc.r) && Number.isFinite(loc.q) ? { r: loc.r, q: loc.q } : null
}

function elementShares(type: HarvestablePoiType): { name: string; share: number }[] {
  const total = type.elements.reduce((sum, [, weight]) => sum + weight, 0)
  return type.elements
    .map(([id, weight]) => ({ name: findElement(id)?.name ?? humanize(id), share: weight / total }))
    .sort((a, b) => b.share - a.share)
}

function artifactView(
  state: ArtifactState,
  type: ArtifactPoiType | undefined,
  waiting: string | undefined,
): NonNullable<PoiView['artifact']> {
  const range = (type ?? defaultArtifactPoiType).recharge
  const recharge = mix(range, state.rechargeRoll)
  // ArtifactPOIStates.RechargeTimeRemaining: whole cycles of 600 seconds.
  const remainingSeconds = Math.ceil((recharge - recharge * state.charge) / 600) * 600
  return {
    state: state.state,
    charge: state.charge,
    remainingSeconds: Math.max(0, remainingSeconds),
    harvests: state.harvests,
    ...(waiting ? { waiting } : {}),
  }
}

/** Artifacts waiting on the starmap, by tile: the `artifact_*` items in the hex cell inventories. */
function waitingArtifacts(save: SaveGame): Map<string, string> {
  const waiting = new Map<string, string>()
  const group = save.gameObjects.find((g) => g.name === 'StarmapHexCellInventory')
  for (const obj of group?.gameObjects ?? []) {
    const loc = location(obj, 'StarmapHexCellInventoryVisuals')
    const items = obj.behaviors.find((b) => b.name === 'StarmapHexCellInventory')?.templateData
      ?.Items as { ID?: { name?: string } }[] | undefined
    const artifact = items?.map((i) => i.ID?.name).find((n) => n?.startsWith('artifact_'))
    if (loc && artifact) waiting.set(`${loc.r},${loc.q}`, artifact)
  }
  return waiting
}

export function saveGameController(save: SaveGame): Behavior | undefined {
  const obj = save.gameObjects.find((g) => g.name === 'SaveGame')?.gameObjects[0]
  return obj?.behaviors.find((b) => b.name === 'StateMachineController')
}

function revealPoints(save: SaveGame): Map<string, number> | null {
  const controller = saveGameController(save)
  return controller ? readRevealPoints(controller.extraRaw) : null
}

/** Every Spaced Out point of interest in the save, harvestable ones first. */
export function listPois(save: SaveGame): PoiView[] {
  const points = revealPoints(save)
  const waiting = waitingArtifacts(save)
  const pois: PoiView[] = []
  for (const group of save.gameObjects) {
    const harvestable = harvestableByPrefab.get(group.name)
    const artifact = artifactByPrefab.get(group.name)
    if (!harvestable && !artifact) continue
    group.gameObjects.forEach((obj, index) => {
      const loc = location(
        obj,
        harvestable ? 'HarvestablePOIClusterGridEntity' : 'ArtifactPOIClusterGridEntity',
      )
      if (!loc) return
      const bytes = obj.behaviors.find((b) => b.name === 'StateMachineController')?.extraRaw
      const base = {
        id: `${group.name}:${index}`,
        location: loc,
        reveal: revealLevel(points, loc.r, loc.q),
      }
      const artifactState = bytes ? readArtifactState(bytes) : null
      const waitingHere = waiting.get(`${loc.r},${loc.q}`)
      if (harvestable) {
        const state = bytes ? readHarvestState(bytes) : null
        // The roll fixes the type's range; a hash that is not the prefab's type is not trusted.
        const trusted = state && harvestableByHash.get(state.hash) === harvestable
        const max = trusted ? mix(harvestable.capacity, state.capacityRoll) : undefined
        pois.push({
          ...base,
          kind: 'harvestable',
          type: harvestable.id,
          name: harvestable.name,
          ...(trusted && max !== undefined
            ? {
                harvest: {
                  current: state.capacity,
                  max,
                  rechargeSeconds: mix(harvestable.recharge, state.rechargeRoll),
                  elements: elementShares(harvestable),
                },
              }
            : {}),
          ...(artifactState
            ? { artifact: artifactView(artifactState, defaultArtifactPoiType, waitingHere) }
            : {}),
        })
      } else if (artifact) {
        pois.push({
          ...base,
          kind: 'artifact',
          type: artifact.id,
          name: artifact.name,
          ...(artifactState && artifactByHash.get(artifactState.hash) === artifact
            ? { artifact: artifactView(artifactState, artifact, waitingHere) }
            : {}),
        })
      }
    })
  }
  return pois.sort(
    (a, b) =>
      Number(a.kind === 'artifact') - Number(b.kind === 'artifact') ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id, undefined, { numeric: true }),
  )
}

export interface PoiOverview {
  pois: PoiView[]
  /** Known starmap cells and how many are not fully revealed; null when the fog could not be read. */
  reveal: { cells: number; pending: number } | null
}

export function listPoiOverview(save: SaveGame): PoiOverview {
  const controller = saveGameController(save)
  const fog = controller ? readFog(controller.extraRaw) : null
  const pending = fog ? [...fog.points.values()].filter((v) => v < POINTS_TO_REVEAL).length : 0
  return {
    pois: listPois(save),
    reveal: fog ? { cells: fog.count, pending } : null,
  }
}
