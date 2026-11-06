import type { GameObject } from '@oni-duplicity/save-parser'
import { masteredSkillIds, modifiers, traitIdsOf } from './save-helpers.ts'

/**
 * Bionic amount maximums, from the decompiled game.
 * - BionicOil: `BionicOilMonitor.OIL_CAPACITY`, and `Amounts.BionicOil` max, both 200.
 * - BionicGunk: `GunkMonitor.GUNK_CAPACITY`, 80.
 * - BionicOxygenTank: `BionicOxygenTankMonitor.OXYGEN_TANK_CAPACITY_KG`, 2400 s × 0.1 kg/s = 240.
 * - BionicInternalBattery: `Amounts.BionicInternalBattery` max 480,000 J, which
 *   `BionicBatteryMonitor.UpdateCapacityAmount` raises by 120,000 J for every electrobank slot
 *   above 4. The slot count is the `BionicBatteryCountCapacity` attribute (base 4), and the only
 *   thing that raises it is the `ExtraBionicBatteries` perk (+2) of the BionicsC3 skill. Installed
 *   electrobanks play no part: they are only how the charge is topped up.
 */
export const BIONIC_OIL_MAX = 200
export const BIONIC_GUNK_MAX = 80
export const BIONIC_OXYGEN_TANK_MAX = 240
export const BIONIC_BATTERY_BASE_MAX = 480_000
const BIONIC_BATTERY_PER_SLOT = 120_000
const BIONIC_BATTERY_BASE_SLOTS = 4
const BIONIC_BATTERY_SKILL = 'BionicsC3'
const BIONIC_BATTERY_SKILL_SLOTS = 2

/** The game's maximum for a bionic amount, or undefined for any other amount. */
export function bionicAmountMax(
  amountId: string,
  masteredSkills: Iterable<string>,
): number | undefined {
  switch (amountId) {
    case 'BionicOil':
      return BIONIC_OIL_MAX
    case 'BionicGunk':
      return BIONIC_GUNK_MAX
    case 'BionicOxygenTank':
      return BIONIC_OXYGEN_TANK_MAX
    case 'BionicInternalBattery': {
      const slots =
        BIONIC_BATTERY_BASE_SLOTS +
        ([...masteredSkills].includes(BIONIC_BATTERY_SKILL) ? BIONIC_BATTERY_SKILL_SLOTS : 0)
      return BIONIC_BATTERY_BASE_MAX + BIONIC_BATTERY_PER_SLOT * (slots - BIONIC_BATTERY_BASE_SLOTS)
    }
    default:
      return undefined
  }
}

/**
 * Maximums of a standard duplicant's amounts, from the decompiled game.
 * - `Database/Amounts.cs` (`CreateAmount(id, min, max, …)`): Stamina, Stress, Bladder, Toxicity
 *   and Breath 0..100, Decor -1000..1000, RadiationBalance and Temperature 0..10000.
 *   `ImmuneLevel` takes `DUPLICANTSTATS.STANDARD.BaseStats.IMMUNE_LEVEL_MAX` (100).
 * - `HitPoints` and `Calories` are created with a maximum of 0; the minion prefab adds
 *   `BaseStats.HIT_POINTS` (100, `BaseMinionConfig.BaseMinionTraits`) and `BaseStats.MAX_CALORIES`
 *   (4,000,000 cal, `MinionConfig`) as modifiers to the max attribute. Bionics have
 *   `MAX_CALORIES = 0` and no calories amount.
 * - The only things that change these maximums are the Breath ones: the `Minnow` trait
 *   (`BreathMax` +400, `TRAITS.cs`) and the Swimming skill (`IncreasedLungCapacity`, +100,
 *   `SkillPerks.cs`). No trait, skill or effect modifies another duplicant amount's max.
 * - The saved value is a raw float (`AmountInstance.value`); the game clamps only on the next
 *   `SetValue` or `ApplyDelta`, not on load, so an out-of-range value stays until then.
 */
const DUPLICANT_AMOUNT_LIMITS: Record<string, { min: number; max: number }> = {
  Stamina: { min: 0, max: 100 },
  Stress: { min: 0, max: 100 },
  Bladder: { min: 0, max: 100 },
  Toxicity: { min: 0, max: 100 },
  ImmuneLevel: { min: 0, max: 100 },
  HitPoints: { min: 0, max: 100 },
  Breath: { min: 0, max: 100 },
  Calories: { min: 0, max: 4_000_000 },
  RadiationBalance: { min: 0, max: 10_000 },
  Decor: { min: -1000, max: 1000 },
  Temperature: { min: 0, max: 10_000 },
}
export const MINNOW_BREATH_BONUS = 400
export const SWIMMING_BREATH_BONUS = 100

export interface AmountLimit {
  min: number
  max: number
}

/**
 * The game's range for one of a duplicant's amounts, or undefined when it can't be derived
 * (an amount this table doesn't know, such as a modded one). The editor leaves those unclamped.
 */
export function duplicantAmountLimit(
  amountId: string,
  isBionic: boolean,
  traitIds: Iterable<string>,
  masteredSkills: Iterable<string>,
): AmountLimit | undefined {
  const bionicMax = isBionic ? bionicAmountMax(amountId, masteredSkills) : undefined
  if (bionicMax !== undefined) return { min: 0, max: bionicMax }
  if (isBionic && amountId === 'Calories') return undefined
  const base = DUPLICANT_AMOUNT_LIMITS[amountId]
  if (!base) return undefined
  if (amountId !== 'Breath') return base
  const skills = new Set(masteredSkills)
  const traits = new Set(traitIds)
  return {
    min: base.min,
    max:
      base.max +
      (traits.has('Minnow') ? MINNOW_BREATH_BONUS : 0) +
      (skills.has('Swimming') ? SWIMMING_BREATH_BONUS : 0),
  }
}

export function limitOf(obj: GameObject, id: string, amountId: string): AmountLimit | undefined {
  return duplicantAmountLimit(
    amountId,
    id.startsWith('BionicMinion:'),
    traitIdsOf(obj),
    masteredSkillIds(obj),
  )
}

/**
 * Brings every amount whose maximum just dropped (a lost trait or skill) back under it, in the
 * same edit, so undo restores both. Never raises a value.
 */
export function reclampAmounts(obj: GameObject, id: string): void {
  for (const amount of modifiers(obj)?.amounts ?? []) {
    const limit = limitOf(obj, id, amount.name)
    const stored = amount.value as { value: number } | undefined
    if (limit && stored && Number.isFinite(stored.value) && stored.value > limit.max) {
      stored.value = limit.max
    }
  }
}
