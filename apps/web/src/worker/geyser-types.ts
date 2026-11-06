import type { Range } from '@oni-duplicity/game-data'

export interface GeyserView {
  id: string
  prefab: string
  typeName: string
  typeDesc?: string
  name: string
  x: number
  y: number
  /** The `WorldView` id of the asteroid it is on, when its position falls inside one. */
  asteroid?: string
  /** Kilograms emitted per cycle while active (`scaledRate`). */
  massPerCycle: number
  /** Seconds per eruption cycle, and the share of it spent erupting. */
  iterationSeconds: number
  iterationPercent: number
  /** Seconds per activity cycle, and the share of it spent active. */
  yearSeconds: number
  yearPercent: number
  /** The type's natural range per field; missing for types the editor doesn't know. */
  ranges?: Record<GeyserField, Range>
  /**
   * False when the saved values aren't what the rolls give (changed by a mod or another
   * editor). The game recomputes them from the rolls when it loads the save.
   */
  matchesRolls: boolean
  /** The type ID, for geysers whose prefab and saved type agree (the only ones that can change type). */
  typeId?: string
  /** Types this geyser can change to: same footprint, and every DLC the save has active. */
  swapTargets: { id: string; name: string }[]
  /** Whether the Geyser Control mod's behaviors are on it; the mod may reapply its own values. */
  hasGeyserControl: boolean
}

/**
 * The game saves both the rolls and the values they give (`scaled*`), but recomputes the values
 * from the rolls when it loads a save. An edit therefore sets the roll and writes the matching
 * value, which keeps the save consistent whichever of the two the game reads.
 */
export type GeyserField =
  | 'scaledRate'
  | 'scaledIterationLength'
  | 'scaledIterationPercent'
  | 'scaledYearLength'
  | 'scaledYearPercent'
