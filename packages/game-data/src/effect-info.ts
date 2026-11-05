/**
 * Duplicant effect metadata: whether the game counts an effect as bad, how long it lasts and
 * which attribute modifiers it carries.
 *
 * Most effects come from the `MinionModifiers` table in `resources.assets`, which
 * `scripts/extract-game-data.ts` reads (`ModifierSet.LoadEffects` builds an `Effect` from it).
 * The effects below are constructed in code instead, transcribed by hand from the decompiled game
 * (Kupie/ONI_Decomp):
 * - `ModifierSet.cs`: the effects created after `LoadEffects` (`PassedOutSleep`, `WarmTouch`,
 *   `WarmTouchFood`, `RefreshingTouch`, `GunkSick`, `ExpellingGunk`, `GunkHungover`,
 *   `NoLubricationMinor`, `NoLubricationMajor`, `BionicOffline`, `BionicBedTimeEffect`,
 *   `BionicWaterStress`, `DuplicantDrankInk`).
 * - `Db.cs`: `CenterOfAttention`. `BingeEatChore.cs`: `Binge_Eating`.
 * - `RelaxationPoint.cs` (`StressReduction`) and `MegaBrainTank.cs` (`MegaBrainTankBonus`) build
 *   their modifiers from the building's tuning, so they are listed without any.
 * The game stores these modifiers per second; they are multiplied by 600 here to give per cycle.
 * Durations are seconds divided by 600.
 *
 * Nothing in the game marks an effect as neutral: `Effect.isBad` is a plain boolean, so every
 * effect is either good or bad. Many catalog entries that the strings file lists under
 * `DUPLICANTS.MODIFIERS` (`Hungry`, `Starving`, `dead` ...) are not effects at all and have no
 * info; they are `undefined` here.
 */

export type EffectUnits = 'Flat' | 'PerDay' | 'PerSecond'

/** One attribute change. `PerDay` is per cycle; `PerSecond` is the game's per-second rate. */
export interface EffectModifier {
  /** Attribute ID, e.g. `StressDelta`, `Athletics`. */
  attribute: string
  value: number
  units: EffectUnits
  /** The value is a fraction of the attribute (+0.1 is +10%) instead of an addition. */
  multiplier: boolean
}

export interface EffectInfo {
  /** `Effect.isBad`. */
  bad: boolean
  /** Cycles the effect lasts when applied; 0 when it lasts until something removes it. */
  duration: number
  modifiers: EffectModifier[]
}

export interface EffectDetailRow extends EffectInfo {
  id: string
}

const perCycle = (attribute: string, value: number, units: EffectUnits = 'PerDay') => ({
  attribute,
  value,
  units,
  multiplier: false,
})

/** Effects built in code, keyed by lower-cased ID. */
export const codeEffects: Record<string, EffectInfo> = {
  passedoutsleep: {
    bad: true,
    duration: 0,
    modifiers: [perCycle('StaminaDelta', 400), perCycle('StressDelta', -20)],
  },
  warmtouch: { bad: false, duration: 0.2, modifiers: [] },
  warmtouchfood: { bad: false, duration: 1, modifiers: [] },
  refreshingtouch: { bad: false, duration: 0.2, modifiers: [] },
  gunksick: { bad: true, duration: 0, modifiers: [perCycle('StressDelta', 20)] },
  expellinggunk: { bad: true, duration: 0, modifiers: [perCycle('StressDelta', 50)] },
  gunkhungover: { bad: true, duration: 1, modifiers: [perCycle('StressDelta', 20)] },
  nolubricationminor: {
    bad: true,
    duration: 0,
    modifiers: [perCycle('Athletics', -4, 'Flat'), perCycle('StressDelta', 15)],
  },
  nolubricationmajor: {
    bad: true,
    duration: 0,
    modifiers: [perCycle('Athletics', -8, 'Flat'), perCycle('StressDelta', 30)],
  },
  bionicoffline: { bad: true, duration: 0, modifiers: [] },
  bionicbedtimeeffect: { bad: false, duration: 0, modifiers: [perCycle('StressDelta', -20)] },
  bionicwaterstress: { bad: true, duration: 0, modifiers: [perCycle('StressDelta', 200)] },
  duplicantdrankink: {
    bad: false,
    duration: 1,
    // The radiation resistance modifier is only added with the Spaced Out DLC.
    modifiers: [
      perCycle('StressDelta', -10),
      perCycle('QualityOfLife', 1, 'Flat'),
      perCycle('RadiationResistance', 0.2, 'Flat'),
    ],
  },
  centerofattention: { bad: false, duration: 0, modifiers: [perCycle('StressDelta', -5)] },
  binge_eating: {
    bad: true,
    duration: 0,
    modifiers: [perCycle('Decor', -30, 'Flat'), perCycle('CaloriesDelta', -4_000_000)],
  },
  stressreduction: { bad: false, duration: 0, modifiers: [] },
  megabraintankbonus: { bad: false, duration: 0, modifiers: [] },
}

export function buildEffectIndex(rows: EffectDetailRow[]): (id: string) => EffectInfo | undefined {
  const byId = new Map<string, EffectInfo>(Object.entries(codeEffects))
  for (const { id, ...info } of rows) byId.set(id.toLowerCase(), info)
  return (id) => byId.get(id.toLowerCase())
}

export type EffectGroup = 'good' | 'bad' | 'other'

export const effectGroupLabels: Record<EffectGroup, string> = {
  good: 'Good',
  bad: 'Bad',
  other: 'Other',
}

/** Attributes the game shows as a percentage of the base value. */
const PERCENT_ATTRIBUTES = new Set([
  'ToiletEfficiency',
  'DiseaseCureSpeed',
  'MachinerySpeed',
  'RadiationResistance',
  'GeneratorOutput',
])

/** Attributes where a higher value is worse for the duplicant. */
const HIGHER_IS_WORSE = new Set([
  'StressDelta',
  'BladderDelta',
  'ToxicityDelta',
  'AirConsumptionRate',
  'Sneezyness',
])

export type ModifierTone = 'good' | 'bad' | 'neutral'

export interface FormattedModifier {
  /** Attribute label: `Athletics`, `Stress`. */
  label: string
  /** Signed value: `+3`, `-20/cycle`, `+10%`. */
  text: string
  tone: ModifierTone
}

const fmt = (n: number) => String(Number(n.toFixed(2)))
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${fmt(Math.abs(n))}`

/** A short label for one modifier. `attributeName` is the game's display name when it has one. */
export function formatEffectModifier(
  modifier: EffectModifier,
  attributeName: string | undefined,
): FormattedModifier | undefined {
  if (!modifier.attribute) return undefined
  const rate = modifier.units !== 'Flat'
  const label =
    attributeName ??
    modifier.attribute
      .replace(/Delta$/, '')
      .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
      .trim()
  let value = modifier.value
  let text: string
  if (modifier.multiplier) {
    text = `${signed(value * 100)}%`
  } else if (rate) {
    if (modifier.units === 'PerSecond') value *= 600
    text =
      modifier.attribute === 'CaloriesDelta'
        ? `${signed(value / 1000)} kcal/cycle`
        : `${signed(value)}/cycle`
  } else if (PERCENT_ATTRIBUTES.has(modifier.attribute)) {
    // GeneratorOutput is already a percentage; the others are fractions.
    text = `${signed(modifier.attribute === 'GeneratorOutput' ? value : value * 100)}%`
  } else {
    text = signed(value)
  }
  const sign = Math.sign(modifier.value)
  const worse = HIGHER_IS_WORSE.has(modifier.attribute) ? -sign : sign
  const tone: ModifierTone = worse > 0 ? 'good' : worse < 0 ? 'bad' : 'neutral'
  return { label, text, tone }
}
