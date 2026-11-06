import type { Behavior, SaveGame } from '@oni-duplicity/save-parser'
import { readInstance } from './pois-reader.ts'
import type { RevealLevel } from './pois-types.ts'

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
    if (count < 0 || count > 1_000_000) return null
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

export function revealLevel(
  points: Map<string, number> | null,
  r: number,
  q: number,
): RevealLevel | undefined {
  if (!points) return undefined
  const value = points.get(`${r},${q}`) ?? 0
  if (value >= POINTS_TO_REVEAL) return 'revealed'
  return value > 0 ? 'peeked' : 'hidden'
}

export function saveGameController(save: SaveGame): Behavior | undefined {
  const obj = save.gameObjects.find((g) => g.name === 'SaveGame')?.gameObjects[0]
  return obj?.behaviors.find((b) => b.name === 'StateMachineController')
}

export function revealPoints(save: SaveGame): Map<string, number> | null {
  const controller = saveGameController(save)
  return controller ? readRevealPoints(controller.extraRaw) : null
}
