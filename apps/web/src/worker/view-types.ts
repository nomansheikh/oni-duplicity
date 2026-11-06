import type { DestinationState } from './space-edits.ts'

export interface Named {
  id: string
  name: string
  desc?: string
}

export interface Summary {
  fileName: string
  baseName: string
  cycles: number
  duplicants: number
  version: string
  buildVersion: number
  dlcIds: string[]
  clusterId: string
  isAutoSave: boolean
  /** The save this was written from (`gameInfo.originalSaveName`); autosaves are named after it. */
  originalSaveName: string
  sandbox: boolean
  /** Set for good once debug tools are used; blocks achievements. */
  debugWasUsed: boolean
  unverified: boolean
  warnings: string[]
}

export interface InterestView extends Named {
  hash: number
  active: boolean
}

export interface AttributeView extends Named {
  level: number
}

export interface SkillView extends Named {
  group: string
  mastered: boolean
}

export interface AmountView extends Named {
  value: number
  /** Highest value the game allows, when known. */
  max?: number
  /** Lowest value the game allows, when it isn't 0 (decor). */
  min?: number
  /** Shown when no maximum could be derived: the value is editable, but not clamped. */
  warning?: string
  /** Why the amount can't be edited (an unconfirmed maximum, a missing DLC). Critter amounts only. */
  readOnlyReason?: string
}

export interface EffectView extends Named {
  cyclesRemaining: number
}

export interface MaterialView {
  id: string
  name: string
  state: string
  looseMass: number
  storedMass: number
  looseCount: number
  storedCount: number
  /** Mass-weighted average temperature in Kelvin. */
  temperature: number
}

export interface MaterialItemView {
  ref: string
  where: string
  loose: boolean
  x: number
  y: number
  mass: number
  temperature: number
  /** Loose items a move order points at; deleting one would leave a dangling reference. */
  protected: boolean
  /** KPrefabID instance ID of a loose chunk, which is what delete edits are addressed by. */
  instanceId: number | null
}

export interface CritterView {
  id: string
  prefab: string
  name: string
  family: string
  baby: boolean
  x: number
  y: number
  /** The `WorldView` id of the asteroid it is on, when its position falls inside one. */
  asteroid?: string
  amounts: AmountView[]
}

export interface TechView extends Named {
  complete: boolean
}

export interface GameSettingView extends Named {
  current: string
  levels: Named[]
  /** False when the stored value isn't a level we know, so we don't risk writing a bad ID. */
  editable: boolean
}

export interface WorldView {
  id: string
  name: string
  worldType: string
  width: number
  height: number
  discovered: boolean
  startWorld: boolean
  visited: boolean
}

export interface DestinationView extends DestinationState {
  id: number
  type: string
  distance: number
  resources: { name: string; amount: number }[]
}
