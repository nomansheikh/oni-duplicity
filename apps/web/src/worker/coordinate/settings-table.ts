/**
 * The settings the game folds into its coordinate, from the decompile (Kupie/ONI_Decomp):
 * `CustomGameSettings.OnPrefabInit` (registration order), `CustomGameSettingConfigs` (levels and
 * their `coordinate_value`) and `CustomMixingSettingsConfigs`.
 */
export interface CoordinateSetting {
  id: string
  /** `coordinate_range`: the radix this setting takes in the code. */
  range: number
  /** `coordinate_value` of every level. */
  values: Record<string, number>
  /** `GetDefaultLevelId()` */
  default: string
  /** `GetNoSweatDefaultLevelId()` */
  nosweat: string
  /** `required_content`: without it the game reads the default level. */
  requires?: string
}

const tier = (...ids: string[]) => Object.fromEntries(ids.map((id, value) => [id, value]))
const list = (
  id: string,
  levels: string[],
  nosweat: string,
  requires?: string,
): CoordinateSetting => ({
  id,
  range: 8,
  values: tier(...levels),
  default: 'Default',
  nosweat,
  ...(requires ? { requires } : {}),
})
const toggle = (id: string, on: string, off: string, requires?: string): CoordinateSetting => ({
  id,
  range: 5,
  values: { [on]: 0, [off]: 1 },
  default: on,
  nosweat: on,
  ...(requires ? { requires } : {}),
})

/** Registration order of the `action(...)` calls whose `coordinate_range` is not -1. */
export function qualitySettings(pureVanilla: boolean): CoordinateSetting[] {
  // `Durability`: the Indestructible and Default values swap in the base game (`IsPureVanilla`).
  const durability: CoordinateSetting = pureVanilla
    ? list(
        'Durability',
        ['Indestructible', 'Reinforced', 'Default', 'Flimsy', 'Threadbare'],
        'Indestructible',
      )
    : list(
        'Durability',
        ['Default', 'Reinforced', 'Indestructible', 'Flimsy', 'Threadbare'],
        'Reinforced',
      )
  if (pureVanilla) durability.default = 'Indestructible'
  return [
    list('ImmuneSystem', ['Default', 'Strong', 'Invincible', 'Weak', 'Compromised'], 'Strong'),
    list('CalorieBurn', ['Default', 'Easy', 'Disabled', 'Hard', 'VeryHard'], 'Easy'),
    list('Morale', ['Default', 'Easy', 'Disabled', 'Hard', 'VeryHard'], 'Easy'),
    durability,
    list(
      'MeteorShowers',
      ['Default', 'Infrequent', 'ClearSkies', 'Intense', 'Doomed'],
      'Infrequent',
    ),
    list(
      'Radiation',
      ['Default', 'Easier', 'Easiest', 'Harder', 'Hardest'],
      'Easier',
      'EXPANSION1_ID',
    ),
    list('Stress', ['Default', 'Optimistic', 'Indomitable', 'Pessimistic', 'Doomed'], 'Optimistic'),
    toggle('StressBreaks', 'Default', 'Disabled'),
    toggle('CarePackages', 'Enabled', 'Disabled'),
    toggle('Teleporters', 'Enabled', 'Disabled', 'EXPANSION1_ID'),
    list('BionicWattage', ['Default', 'Easy', 'VeryEasy', 'Hard', 'VeryHard'], 'Easy', 'DLC3_ID'),
    {
      // Off and Hard both have value 3 in the decompile; Off is kept as decompiled.
      ...list(
        'DemoliorDifficulty',
        ['Default', 'Easy', 'VeryEasy', 'Hard', 'VeryHard'],
        'Easy',
        'DLC4_ID',
      ),
      values: { Default: 0, Easy: 1, VeryEasy: 2, Off: 3, Hard: 3, VeryHard: 4 },
    },
  ]
}

const dlcMixing = (id: string): CoordinateSetting => ({
  id,
  range: 5,
  values: { Disabled: 0, Enabled: 1 },
  default: 'Disabled',
  nosweat: 'Disabled',
  requires: id,
})
// `WorldMixingSettingConfig` and `SubworldMixingSettingConfig` (sic: "GuranteeMixing").
const worldMixing = (id: string, requires: string): CoordinateSetting => ({
  id,
  range: 5,
  values: { Disabled: 0, TryMixing: 1, GuranteeMixing: 2 },
  default: 'Disabled',
  nosweat: 'Disabled',
  requires,
})

/** Registration order of the `action3(...)` calls. */
export const MIXING_SETTINGS: CoordinateSetting[] = [
  dlcMixing('DLC2_ID'),
  worldMixing('IceCavesMixing', 'DLC2_ID'),
  worldMixing('CarrotQuarryMixing', 'DLC2_ID'),
  worldMixing('SugarWoodsMixing', 'DLC2_ID'),
  worldMixing('CeresAsteroidMixing', 'DLC2_ID'),
  dlcMixing('DLC3_ID'),
  dlcMixing('DLC4_ID'),
  worldMixing('GardenMixing', 'DLC4_ID'),
  worldMixing('RaptorMixing', 'DLC4_ID'),
  worldMixing('WetlandsMixing', 'DLC4_ID'),
  worldMixing('PrehistoricAsteroidMixing', 'DLC4_ID'),
  dlcMixing('DLC5_ID'),
  worldMixing('BeachMixing', 'DLC5_ID'),
  worldMixing('ReefMixing', 'DLC5_ID'),
  worldMixing('KelpForestMixing', 'DLC5_ID'),
  worldMixing('AbyssMixing', 'DLC5_ID'),
  worldMixing('AquaticAsteroidMixing', 'DLC5_ID'),
]
