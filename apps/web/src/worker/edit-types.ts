import type { AccessorySlot, DuplicantProfile, ProfileSection } from './duplicant-types.ts'
import type { GeyserField } from './geyser-types.ts'
import type { RawPath } from './raw-view-types.ts'
import type { SpaceEdit } from './space-edits.ts'

export type Edit =
  | { type: 'setColonyName'; name: string }
  | { type: 'setSandbox'; enabled: boolean }
  | { type: 'setDuplicantName'; id: string; name: string }
  | { type: 'setGender'; id: string; gender: string }
  | { type: 'addTrait'; id: string; traitId: string }
  | { type: 'removeTrait'; id: string; traitId: string }
  | { type: 'setInterest'; id: string; hash: number; active: boolean }
  | { type: 'setAttributeLevel'; id: string; attributeId: string; level: number }
  | { type: 'setSkillMastered'; id: string; skillId: string; mastered: boolean }
  | { type: 'setExperience'; id: string; experience: number }
  | { type: 'setAmount'; id: string; amountId: string; value: number }
  | { type: 'addEffect'; id: string; effectId: string; cycles: number }
  | { type: 'setEffectCycles'; id: string; effectId: string; cycles: number }
  | { type: 'removeEffect'; id: string; effectId: string }
  | { type: 'setAccessory'; id: string; slot: AccessorySlot; number: string }
  | { type: 'applyProfile'; id: string; profile: DuplicantProfile; sections: ProfileSection[] }
  | { type: 'setDebugWasUsed'; used: boolean }
  | { type: 'bulkDuplicants'; action: 'relieveStress' | 'fillNeeds' | 'masterSkills' }
  | { type: 'bulkDuplicants'; action: 'setAttributes'; level: number }
  | { type: 'setGeyserName'; id: string; name: string }
  | { type: 'setGeyserValue'; id: string; field: GeyserField; value: number }
  | { type: 'setGeyserType'; id: string; typeId: string }
  | { type: 'setItemMass'; ref: string; mass: number }
  | { type: 'setItemTemperature'; ref: string; kelvin: number }
  | { type: 'deleteObject'; id: string }
  | { type: 'deleteDebris'; ids: number[] }
  | { type: 'cloneObject'; id: string }
  | { type: 'cloneDuplicant'; id: string }
  | { type: 'setTechResearched'; techId: string; complete: boolean }
  | { type: 'researchAll' }
  | { type: 'setGameSetting'; settingId: string; level: string }
  | { type: 'setAsteroidName'; id: string; name: string }
  | { type: 'setWorldDiscovered'; id: string; discovered: boolean }
  | { type: 'rawSet'; path: RawPath; value: string | number | boolean | null }
  | { type: 'rawRemove'; path: RawPath }
  | { type: 'rawDuplicate'; path: RawPath }
  | { type: 'rawAdd'; path: RawPath }
  | { type: 'setMaterialTemperature'; elementId: string; kelvin: number }
  | { type: 'scaleMaterialMass'; elementId: string; factor: number }
  | { type: 'setDemoliorImpact'; impactCycle: number }
  | SpaceEdit

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** An edit to one duplicant, without its `id` (the editor adds it). */
export type DuplicantEdit = DistributiveOmit<Extract<Edit, { id: string }>, 'id'>
