import type { SaveGame, TemplateData } from '@oni-duplicity/save-parser'
import { destinationCapacity } from '../lib/space-destinations.ts'
import { revealStarmap, setPoiStock } from './space-edits-bytes.ts'

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
