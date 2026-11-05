import type { Behavior, GameObject, SaveGame, TemplateData } from '@oni-duplicity/save-parser'
import { destinationCapacity } from '../lib/space-destinations.ts'
import {
  mix,
  POINTS_TO_REVEAL,
  harvestableByHash,
  harvestableByPrefab,
  readFog,
  readHarvestState,
  saveGameController,
} from './pois.ts'

// Starmap edits: destination mass and analysis (base game, plain template data), revealing the
// known starmap cells and refilling a POI (both rewrite state machine bytes in place).

export type AnalysisLevel = 'hidden' | 'discovered' | 'complete'

export type SpaceEdit =
  | { type: 'setDestinationMass'; destination: number; mass: number }
  | { type: 'setDestinationAnalysis'; destination: number; level: 'discovered' | 'complete' }
  | { type: 'revealStarmap' }
  | { type: 'setPoiStock'; id: string; kg: number }

/** `ROCKETRY.DESTINATION_ANALYSIS`: the score at which a destination is discovered / complete. */
export const ANALYSIS_DISCOVERED = 50
export const ANALYSIS_COMPLETE = 100

export interface DestinationState {
  /** Kilograms still recoverable and the most the destination type holds; unset for unknown types. */
  mass?: { current: number; capacity: number }
  analysis: AnalysisLevel
  score: number
}

function manager(save: SaveGame): TemplateData {
  const obj = save.gameObjects.find((g) => g.name === 'SaveGame')?.gameObjects[0]
  const found = obj?.behaviors.find((b) => b.name === 'SpacecraftManager')?.templateData
  if (!found) throw new Error('This save has no starmap destinations')
  return found
}

type Destination = { id: number; type: string; availableMass?: number }

function destinationOf(save: SaveGame, id: number): Destination {
  const list = (manager(save).destinations ?? []) as Destination[]
  const found = list.find((d) => d.id === id)
  if (!found) throw new Error(`No destination ${id}`)
  return found
}

function scoresOf(save: SaveGame): [number, number][] {
  const data = manager(save)
  data.destinationAnalysisScores ??= []
  return data.destinationAnalysisScores as [number, number][]
}

const levelOf = (score: number): AnalysisLevel =>
  score >= ANALYSIS_COMPLETE ? 'complete' : score >= ANALYSIS_DISCOVERED ? 'discovered' : 'hidden'

/** Mass and analysis of one destination, for the starmap table. */
export function destinationState(save: SaveGame, d: Destination): DestinationState {
  const score = scoresOf(save).find(([id]) => id === d.id)?.[1] ?? 0
  const capacity = destinationCapacity(d.type)
  return {
    ...(capacity && typeof d.availableMass === 'number'
      ? { mass: { current: d.availableMass, capacity } }
      : {}),
    analysis: levelOf(score),
    score,
  }
}

function setDestinationMass(save: SaveGame, id: number, mass: number): void {
  if (!Number.isFinite(mass)) throw new Error('Mass must be a number')
  const destination = destinationOf(save, id)
  const capacity = destinationCapacity(destination.type)
  if (!capacity) throw new Error(`${destination.type} has no mass to recover`)
  if (typeof destination.availableMass !== 'number') throw new Error('This save has no mass for it')
  destination.availableMass = Math.fround(Math.min(capacity, Math.max(0, mass)))
}

function setDestinationAnalysis(
  save: SaveGame,
  id: number,
  level: 'discovered' | 'complete',
): void {
  destinationOf(save, id)
  const scores = scoresOf(save)
  const entry = scores.find(([key]) => key === id)
  if (level === 'discovered') {
    if (entry) entry[1] = ANALYSIS_DISCOVERED
    else scores.push([id, ANALYSIS_DISCOVERED])
  } else if (!entry) {
    scores.push([id, ANALYSIS_COMPLETE])
  } else if (entry[1] < ANALYSIS_COMPLETE) {
    entry[1] = ANALYSIS_COMPLETE
  }
  const data = manager(save)
  // The game clears the scan target when its analysis completes.
  if (level === 'complete' && data.analyzeDestinationID === id) data.analyzeDestinationID = -1
}

/** Positions where two byte arrays differ. */
function differing(a: Uint8Array, b: Uint8Array): number[] {
  const at: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) at.push(i)
  return at
}

/**
 * Applies a change to a copy of the behavior's bytes, then checks that the length is the same and
 * that only bytes inside the given ranges changed, before swapping the copy in. The copy keeps
 * undo simple: the old array is restored by reference.
 */
function rewrite(
  behavior: Behavior,
  allowed: [number, number][],
  change: (view: DataView) => void,
): void {
  const before = behavior.extraRaw
  const next = before.slice()
  change(new DataView(next.buffer, next.byteOffset, next.byteLength))
  if (next.length !== before.length) throw new Error('The edit changed the byte length')
  const outside = differing(before, next).filter(
    (i) => !allowed.some(([start, end]) => i >= start && i < end),
  )
  if (outside.length > 0) throw new Error('The edit changed bytes it should not touch')
  behavior.extraRaw = next
}

function revealStarmap(save: SaveGame): void {
  const controller = saveGameController(save)
  const fog = controller ? readFog(controller.extraRaw) : null
  if (!controller || !fog) throw new Error('Could not read the starmap reveal state')
  const pending = [...fog.points.values()].filter((v) => v < POINTS_TO_REVEAL).length
  if (pending === 0) throw new Error('Every known starmap cell is already revealed')
  rewrite(controller, [[fog.valuesAt, fog.valuesAt + fog.count * 4]], (view) => {
    for (let i = 0; i < fog.count; i++) {
      const at = fog.valuesAt + i * 4
      if (view.getFloat32(at, true) < POINTS_TO_REVEAL) view.setFloat32(at, POINTS_TO_REVEAL, true)
    }
  })
  // Reading it back must show every known cell revealed and the same cells.
  const after = readFog(controller.extraRaw)
  if (
    !after ||
    after.count !== fog.count ||
    [...after.points].some(([key, v]) => !fog.points.has(key) || v < POINTS_TO_REVEAL)
  ) {
    throw new Error('The starmap reveal state did not read back as written')
  }
}

function poiObject(save: SaveGame, id: string): { obj: GameObject; prefab: string } {
  const split = id.lastIndexOf(':')
  const prefab = id.slice(0, split)
  const obj = save.gameObjects.find((g) => g.name === prefab)?.gameObjects[
    Number(id.slice(split + 1))
  ]
  if (!obj) throw new Error(`No object ${id}`)
  return { obj, prefab }
}

/** EXPERIMENTAL: sets a harvestable POI's stock in both places the save keeps it. */
function setPoiStock(save: SaveGame, id: string, kg: number): void {
  if (!Number.isFinite(kg)) throw new Error('Stock must be a number')
  const { obj, prefab } = poiObject(save, id)
  const type = harvestableByPrefab.get(prefab)
  const controller = obj.behaviors.find((b) => b.name === 'StateMachineController')
  if (!type || !controller) throw new Error('This is not a harvestable POI')
  const state = readHarvestState(controller.extraRaw)
  if (!state || harvestableByHash.get(state.hash) !== type) {
    throw new Error('Could not read this POI’s stock')
  }
  const max = mix(type.capacity, state.capacityRoll)
  const value = Math.fround(Math.min(max, Math.max(0, kg)))
  rewrite(
    controller,
    [
      [state.capacityAt, state.capacityAt + 4],
      [state.parameterAt, state.parameterAt + 4],
    ],
    (view) => {
      view.setFloat32(state.capacityAt, value, true)
      view.setFloat32(state.parameterAt, value, true)
    },
  )
  const after = readHarvestState(controller.extraRaw)
  if (!after || after.capacity !== value || after.hash !== state.hash) {
    throw new Error('The POI stock did not read back as written')
  }
}

export function applySpaceEdit(save: SaveGame, edit: SpaceEdit): void {
  switch (edit.type) {
    case 'setDestinationMass':
      return setDestinationMass(save, edit.destination, edit.mass)
    case 'setDestinationAnalysis':
      return setDestinationAnalysis(save, edit.destination, edit.level)
    case 'revealStarmap':
      return revealStarmap(save)
    case 'setPoiStock':
      return setPoiStock(save, edit.id, edit.kg)
  }
}
