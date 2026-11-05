/**
 * Maximums of the amounts a critter or robot saves, read from the decompiled game
 * (Kupie/ONI_Decomp, `Assembly-CSharp`).
 *
 * An amount's maximum comes from one of three places:
 * - a constant in `Database/Amounts.cs` (`CreateAmount(id, min, max, ...)`): `fixedAmountMax`;
 * - a per-prefab trait modifier on the `<Amount>Max` attribute, in the prefab's `*Config.cs`
 *   (`Age`, `Calories`, `HitPoints`, and a robot's battery): `critterLimits`;
 * - a modifier added at runtime. Nothing here uses one.
 *
 * A missing entry means the maximum is unconfirmed and the editor shows the amount read only.
 */

export interface CritterLimits {
  /** DLCs the prefab needs; the game only spawns it when the save has all of them. */
  requiredDlcIds?: string[]
  /** `Amounts.Age.maxAttribute`: the lifespan in cycles. */
  age?: number
  /** `Amounts.Calories.maxAttribute`: the stomach size in calories. */
  calories?: number
  /**
   * `Amounts.HitPoints.maxAttribute`. Left out where the decompile gives two answers for the
   * prefab (a base config and the species config disagree) or where every fixture save sits
   * below it; see docs/open-questions.md.
   */
  hitPoints?: number
  /** The robot's battery amount and its capacity (`BaseRoverConfig`, `SweepBotConfig`, ...). */
  battery?: { amountId: string; max: number }
}

/** Constants from `Database/Amounts.cs`, where `CreateAmount` sets the max attribute's base value. */
export const fixedAmountMax: Readonly<Record<string, number>> = {
  Wildness: 100,
  Fertility: 100,
  Fertilization: 100,
  Incubation: 100,
  Viability: 100,
  ScaleGrowth: 100,
  MilkProduction: 100,
  ElementGrowth: 100,
  Beckoning: 100,
  Moisture: 100,
  Mucus: 10,
  /** Kelvin. */
  CritterTemperature: 10000,
  Temperature: 10000,
}

/** Display names for the critter and robot amounts the generated list lacks (`STRINGS`). */
export const critterAmountNames: Readonly<Record<string, { name: string; desc?: string }>> = {
  CritterTemperature: { name: 'Body Temperature' },
  Beckoning: { name: 'Accu-moo-lation' },
  ElementGrowth: { name: 'Quill Growth' },
  InternalBattery: { name: 'Rechargeable Battery' },
  InternalChemicalBattery: { name: 'Chemical Battery' },
  InternalBioBattery: { name: 'Biofuel' },
  InternalElectroBank: { name: 'Power Bank' },
}

/**
 * Limits by adult prefab. A baby uses its adult's entry: every `Baby*Config` builds its prefab
 * with the adult's `Create<Adult>(id, ..., is_baby: true)`, which adds the same base trait, and
 * `EntityTemplates.ExtendEntityToBeingABaby` changes no amount's maximum. Each line names the config it came
 * from. Stomach sizes are the tuning's calories per cycle times the cycles to starve, rounded
 * the way the game's float arithmetic rounds.
 */
export const critterLimits: Readonly<Record<string, CritterLimits>> = {
  AlgaeStego: { requiredDlcIds: ['DLC4_ID'], age: 200, calories: 13000000, hitPoints: 50 }, // AlgaeStegoConfig.cs
  Bee: { requiredDlcIds: ['EXPANSION1_ID'], age: 5, hitPoints: 5 }, // BeeConfig.cs
  BeeHive: { requiredDlcIds: ['EXPANSION1_ID'], calories: 45000000, hitPoints: 25 }, // BaseBeeHiveConfig.cs
  Butterfly: { requiredDlcIds: ['DLC4_ID'], age: 5, hitPoints: 5 }, // ButterflyConfig.cs
  Chameleon: { requiredDlcIds: ['DLC4_ID'], age: 50, calories: 10000000, hitPoints: 25 }, // ChameleonConfig.cs
  Crab: { age: 100, calories: 1000000, hitPoints: 25 }, // CrabConfig.cs
  CrabFreshWater: { age: 100, calories: 1000000, hitPoints: 25 }, // CrabFreshWaterConfig.cs
  CrabWood: { age: 100, calories: 1000000, hitPoints: 25 }, // CrabWoodConfig.cs
  DieselMoo: { age: 75, calories: 1200000 }, // DieselMooConfig.cs
  DivergentBeetle: { requiredDlcIds: ['EXPANSION1_ID'], age: 75, calories: 7000000, hitPoints: 25 }, // DivergentBeetleConfig.cs
  DivergentWorm: { requiredDlcIds: ['EXPANSION1_ID'], age: 150, calories: 7000000, hitPoints: 25 }, // DivergentWormConfig.cs
  Drecko: { age: 150, calories: 10000000, hitPoints: 25 }, // DreckoConfig.cs
  DreckoPlastic: { age: 150, calories: 10000000, hitPoints: 25 }, // DreckoPlasticConfig.cs
  GlassDeer: { requiredDlcIds: ['DLC2_ID'], age: 100, calories: 1000000, hitPoints: 25 }, // GlassDeerConfig.cs
  GoldBelly: { requiredDlcIds: ['DLC2_ID'], age: 200, calories: 17777778 }, // GoldBellyConfig.cs
  Hatch: { age: 100, calories: 7000000, hitPoints: 25 }, // HatchConfig.cs
  HatchHard: { age: 100, calories: 7000000, hitPoints: 200 }, // HatchHardConfig.cs
  HatchMetal: { age: 100, calories: 7000000, hitPoints: 400 }, // HatchMetalConfig.cs
  HatchVeggie: { age: 100, calories: 7000000, hitPoints: 25 }, // HatchVeggieConfig.cs
  IceBelly: { requiredDlcIds: ['DLC2_ID'], age: 200, calories: 17777778, hitPoints: 25 }, // IceBellyConfig.cs
  LightBug: { age: 25, calories: 320000, hitPoints: 5 }, // LightBugConfig.cs
  LightBugBlack: { age: 75, calories: 320000, hitPoints: 5 }, // LightBugBlackConfig.cs
  LightBugBlue: { age: 25, calories: 320000, hitPoints: 5 }, // LightBugBlueConfig.cs
  LightBugCrystal: { age: 75, calories: 320000, hitPoints: 5 }, // LightBugCrystalConfig.cs
  LightBugOrange: { age: 25, calories: 320000, hitPoints: 5 }, // LightBugOrangeConfig.cs
  LightBugPink: { age: 25, calories: 320000, hitPoints: 5 }, // LightBugPinkConfig.cs
  LightBugPurple: { age: 25, calories: 320000, hitPoints: 5 }, // LightBugPurpleConfig.cs
  Mole: { age: 100, calories: 48000000, hitPoints: 25 }, // MoleConfig.cs
  MoleDelicacy: { age: 100, calories: 24000000, hitPoints: 25 }, // MoleDelicacyConfig.cs
  Moo: { age: 75, calories: 1200000 }, // MooConfig.cs
  Mosquito: { requiredDlcIds: ['DLC4_ID'], age: 10, hitPoints: 5 }, // MosquitoConfig.cs
  Oilfloater: { age: 100, calories: 600000, hitPoints: 25 }, // OilFloaterConfig.cs
  OilfloaterDecor: { age: 150, calories: 600000, hitPoints: 25 }, // OilFloaterDecorConfig.cs
  OilfloaterHighTemp: { age: 100, calories: 600000, hitPoints: 25 }, // OilFloaterHighTempConfig.cs
  Pacu: { age: 25, calories: 500000, hitPoints: 25 }, // PacuConfig.cs (+Base)
  PacuCleaner: { age: 25, calories: 500000, hitPoints: 25 }, // PacuCleanerConfig.cs (+Base)
  PacuTropical: { age: 25, calories: 500000, hitPoints: 25 }, // PacuTropicalConfig.cs (+Base)
  ParrotFish: { requiredDlcIds: ['DLC5_ID'], age: 25, calories: 500000, hitPoints: 25 }, // ParrotFishConfig.cs (+Base)
  PrehistoricPacu: { requiredDlcIds: ['DLC4_ID'], age: 100, calories: 500000 }, // PrehistoricPacuConfig.cs
  PufferFish: { requiredDlcIds: ['DLC5_ID'], age: 25, calories: 2000000, hitPoints: 25 }, // PufferFishConfig.cs (+Base)
  Puft: { age: 75, calories: 1200000, hitPoints: 25 }, // PuftConfig.cs
  PuftAlpha: { age: 75, calories: 1200000, hitPoints: 25 }, // PuftAlphaConfig.cs
  PuftBleachstone: { age: 75, calories: 1200000, hitPoints: 25 }, // PuftBleachstoneConfig.cs
  PuftOxylite: { age: 75, calories: 1200000, hitPoints: 25 }, // PuftOxyliteConfig.cs
  Raptor: { requiredDlcIds: ['DLC4_ID'], age: 200, calories: 8000000, hitPoints: 50 }, // RaptorConfig.cs
  SeaFairy: { requiredDlcIds: ['DLC5_ID'], age: 5, hitPoints: 5 }, // SeaFairyConfig.cs
  SeaHorse: { requiredDlcIds: ['DLC5_ID'], age: 100, calories: 500000, hitPoints: 25 }, // SeaHorseConfig.cs (+Base)
  SeaTurtle: { requiredDlcIds: ['DLC5_ID'], age: 100, calories: 4000000 }, // SeaTurtleConfig.cs
  Seal: { requiredDlcIds: ['DLC2_ID'], age: 100, calories: 1000000, hitPoints: 25 }, // SealConfig.cs
  Snail: { requiredDlcIds: ['DLC5_ID'], age: 25, calories: 300000, hitPoints: 25 }, // SnailConfig.cs (+Base)
  SnailIron: { requiredDlcIds: ['DLC5_ID'], age: 25, calories: 300000, hitPoints: 25 }, // SnailIronConfig.cs (+Base)
  Squid: { requiredDlcIds: ['DLC5_ID'], age: 100, calories: 500000 }, // SquidConfig.cs
  Squirrel: { age: 100, calories: 1000000, hitPoints: 25 }, // SquirrelConfig.cs
  SquirrelHug: { age: 100, calories: 1000000, hitPoints: 25 }, // SquirrelHugConfig.cs
  Staterpillar: { requiredDlcIds: ['EXPANSION1_ID'], age: 100, calories: 10000000, hitPoints: 25 }, // StaterpillarConfig.cs
  StaterpillarGas: {
    requiredDlcIds: ['EXPANSION1_ID'],
    age: 100,
    calories: 10000000,
    hitPoints: 25,
  }, // StaterpillarGasConfig.cs
  StaterpillarLiquid: {
    requiredDlcIds: ['EXPANSION1_ID'],
    age: 100,
    calories: 10000000,
    hitPoints: 25,
  }, // StaterpillarLiquidConfig.cs
  Stego: { requiredDlcIds: ['DLC4_ID'], age: 200, calories: 13000000, hitPoints: 50 }, // StegoConfig.cs
  WoodDeer: { requiredDlcIds: ['DLC2_ID'], age: 100, calories: 1000000, hitPoints: 25 }, // WoodDeerConfig.cs
  // Morb: `GlomConfig.cs`.
  Glom: { hitPoints: 25 },

  // Robots. Hit points are 100 (`TUNING/ROBOTS.cs`); a sweep bot sets none.
  FetchDrone: {
    requiredDlcIds: ['DLC3_ID'],
    hitPoints: 100,
    battery: { amountId: 'InternalElectroBank', max: 120000 },
  }, // FetchDroneConfig.cs
  ScoutRover: {
    requiredDlcIds: ['EXPANSION1_ID'],
    hitPoints: 100,
    battery: { amountId: 'InternalChemicalBattery', max: 180000 },
  }, // ScoutRoverConfig.cs: 30 per second * 10 * 600
  MorbRover: {
    hitPoints: 100,
    battery: { amountId: 'InternalBioBattery', max: 180000 },
  }, // MorbRoverConfig.cs
  SweepBot: { battery: { amountId: 'InternalBattery', max: 9000 } }, // SweepBotConfig.cs
}

function limitsOf(prefab: string): CritterLimits | undefined {
  return critterLimits[prefab] ?? critterLimits[prefab.replace(/Baby$/, '')]
}

export type CritterAmountMax =
  /** Editable between 0 and `max`. */
  | { max: number }
  /** Shown but not editable, with the reason. */
  | { max?: undefined; reason: string }

/**
 * The editable range of an amount on a prefab, or why it is read only. `dlcIds` are the DLCs
 * the save has; a prefab whose DLC the save lacks is not one the game could have spawned.
 */
export function critterAmountMax(
  prefab: string,
  amountId: string,
  dlcIds: readonly string[],
): CritterAmountMax {
  const limits = limitsOf(prefab)
  if (!limits) return { reason: 'This critter is not in the game data' }
  if (!(limits.requiredDlcIds ?? []).every((id) => dlcIds.includes(id))) {
    return { reason: "The save does not have this critter's DLC" }
  }
  const fixed = fixedAmountMax[amountId]
  if (fixed !== undefined) return { max: fixed }
  const max =
    amountId === 'Age'
      ? limits.age
      : amountId === 'Calories'
        ? limits.calories
        : amountId === 'HitPoints'
          ? limits.hitPoints
          : limits.battery?.amountId === amountId
            ? limits.battery.max
            : undefined
  return max === undefined ? { reason: 'The maximum is not confirmed' } : { max }
}
