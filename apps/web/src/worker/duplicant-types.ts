import type { DuplicantModel } from '@oni-duplicity/game-data'
import type {
  AmountView,
  AttributeView,
  EffectView,
  InterestView,
  Named,
  SkillView,
} from './view-types.ts'

export type AccessorySlot = 'hair' | 'headshape' | 'eyes' | 'mouth' | 'torso' | 'skin'

export interface AccessorySlotView {
  slot: AccessorySlot
  label: string
  current: string
  options: string[]
}

export interface DuplicantView {
  id: string
  prefab: string
  isBionic: boolean
  /** The duplicant model, which decides the traits and skills it can have. */
  model: DuplicantModel
  /** DLC IDs active in the save. */
  dlcIds: string[]
  /** The cycle the duplicant arrived in (`MinionIdentity.arrivalTime`; 0 for the first three). */
  arrivalTime: number
  /** Cycles since arrival, as the game shows it: the current cycle minus `arrivalTime`. */
  age: number
  name: string
  gender: string
  personality: Named
  hat: string | null
  traits: Named[]
  interests: InterestView[]
  attributes: AttributeView[]
  skills: SkillView[]
  experience: number
  amounts: AmountView[]
  effects: EffectView[]
  appearance: AccessorySlotView[]
}

export interface Catalogs {
  traits: Named[]
  effects: Named[]
}

/** A portable copy of a duplicant's editable state (copy/paste and JSON export). */
export interface DuplicantProfile {
  format: 'duplicity-duplicant@1'
  /** The model copied from; older exports lack it (read from the traits). */
  model?: DuplicantModel
  name: string
  gender: string
  traits: string[]
  interests: string[]
  attributes: Record<string, number>
  skills: string[]
  experience: number
  appearance: Partial<Record<AccessorySlot, string>>
}

export type ProfileSection =
  | 'name'
  | 'traits'
  | 'interests'
  | 'attributes'
  | 'skills'
  | 'appearance'
