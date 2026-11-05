/**
 * Critter ranching constants, read from the decompiled game (Assembly-CSharp).
 * Every number cites the file and the constant or expression it came from.
 * Where a value could not be determined it is omitted (optional field) with a comment saying why.
 *
 * Units: "cycle" = 600 s. Calories are the game's raw `Calories` amount (1 kcal = 1000 cal).
 * Masses are kg. Temperatures are Kelvin.
 *
 * Coverage: every species below has a Config with an egg and is ranchable. Not covered (see the
 * report that accompanied this file): IceBelly, GoldBelly, Staterpillar x3, Snail x2, PrehistoricPacu,
 * ParrotFish, PufferFish, SeaHorse, SeaTurtle, Squid. Mosquito is `is_ranchable = false`. Bee has no egg.
 */

export interface RanchDiet {
  /** element / tag / food ids exactly as named in code */
  eats: string[]
  /** how the Diet.Info consumes it */
  foodType?: 'EatSolid' | 'EatPlantDirectly' | 'EatPlantStorage' | 'EatButcheredPrey'
  /** calories per kg (or per unit) of the eaten item. Omitted when it depends on data not in the decompiled code */
  caloriesPerKg?: number
  /** kg eaten per cycle at the standard calorie burn = caloriesPerCycle / caloriesPerKg. Only when derivable */
  kgPerCycle?: number
  /** plant diets: calories per "cycle of plant growth" consumed (Diet.Info caloriesPerKg for EatPlantDirectly) */
  caloriesPerPlantGrowthCycle?: number
  /** plant diets: plant-growth cycles consumed per cycle at the standard calorie burn */
  plantGrowthCyclesPerCycle?: number
  /** only for the listed DLC ids (diet entry is added conditionally in code) */
  dlcIds?: string[]
  produces?: {
    item: string
    /** kg produced per kg eaten (Diet.Info producedConversionRate). For plant diets: kg per plant-growth cycle */
    ratio: number
    /** kg produced per cycle at standard burn, when derivable */
    kgPerCycle?: number
  }
  note?: string
}

export interface RanchProduct {
  item: string
  amountKg?: number
  perCycle?: number
  note: string
}

export interface RanchSpecies {
  /** adult prefab id, as in the save */
  id: string
  name: string
  family: string
  dlcIds?: string[]
  /** cells of room one critter needs (OvercrowdingMonitor.Def.spaceRequiredPerCreature) */
  spacePerCritter: number
  /** lifespan in cycles (Age.maxAttribute in the base trait) */
  lifespanCycles: number
  /** calories burned per cycle (Calories.deltaAttribute x 600) */
  caloriesPerCycle: number
  diet: RanchDiet[]
  products: RanchProduct[]
  egg?: {
    id: string
    /** cycles between eggs (FertilityMonitor.Def.baseFertileCycles), at full happiness and no overcrowding */
    fertilityCycles?: number
    /** cycles to hatch (baseIncubationRate = 100 / (600 * incubationCycles)) */
    incubationCycles?: number
    massKg?: number
    /** fraction of the egg mass dropped as EggShell on hatch (IncubationMonitor.SpawnShell); default 0.5 */
    shellRatio?: number
  }
  cite: string[]
}

// ---------------------------------------------------------------------------
// Shared tuning values (TUNING/CREATURES.cs unless noted)
// ---------------------------------------------------------------------------

/** TUNING/CREATURES.cs SPACE_REQUIREMENTS.TIER1..TIER4 (static ints) */
const SPACE = { TIER1: 4, TIER2: 8, TIER3: 12, TIER4: 16 } as const

/** TUNING/CREATURES.cs CONVERSION_EFFICIENCY (static floats) */
const CONV = {
  BAD_2: 0.1,
  BAD_1: 0.25,
  NORMAL: 0.5,
  GOOD_0: 0.6666667,
  GOOD_1: 0.75,
  GOOD_2: 0.95,
  GOOD_3: 1,
} as const

/** Per-species standard calorie burn per cycle */
const CAL = {
  hatch: 700000, // HatchTuning.cs STANDARD_CALORIES_PER_CYCLE
  puft: 200000, // PuftTuning.cs STANDARD_CALORIES_PER_CYCLE
  drecko: 2000000, // DreckoTuning.cs STANDARD_CALORIES_PER_CYCLE
  pacu: 100000, // PacuTuning.cs STANDARD_CALORIES_PER_CYCLE
  oilfloater: 120000, // OilFloaterTuning.cs STANDARD_CALORIES_PER_CYCLE
  lightbug: 40000, // LightBugTuning.cs STANDARD_CALORIES_PER_CYCLE
  squirrel: 100000, // SquirrelTuning.cs STANDARD_CALORIES_PER_CYCLE
  moo: 200000, // MooTuning.cs STANDARD_CALORIES_PER_CYCLE
  mole: 4800000, // MoleTuning.cs STANDARD_CALORIES_PER_CYCLE
  crab: 100000, // CrabTuning.cs STANDARD_CALORIES_PER_CYCLE
  divergent: 700000, // DivergentTuning.cs STANDARD_CALORIES_PER_CYCLE
  stego: 4 * 325000, // StegoTuning.cs VINE_FOOD_PER_CYCLE (4) * 325000
  chameleon: 2000000, // ChameleonTuning.cs STANDARD_CALORIES_PER_CYCLE
  raptor: 0.5 * 1600000, // RaptorTuning.cs 0.5 * FOOD.FOOD_TYPES.MEAT.CaloriesPerUnit (TUNING/FOOD.cs MEAT = 1600000)
  seal: 100000, // SealTuning.cs STANDARD_CALORIES_PER_CYCLE (SealConfig.cs actually reads SquirrelTuning.STANDARD_CALORIES_PER_CYCLE = 100000)
  deer: 100000, // DeerTuning.cs STANDARD_CALORIES_PER_CYCLE (WoodDeerConfig/GlassDeerConfig use the literal -166.66667 / 600 s)
} as const

/** Egg masses in kg */
const EGG_MASS = {
  hatch: 2, // HatchTuning.cs EGG_MASS
  puft: 0.5, // PuftTuning.cs EGG_MASS
  drecko: 2, // DreckoTuning.cs EGG_MASS
  pacu: 0.75, // PacuTuning.cs EGG_MASS
  oilfloater: 2, // OilFloaterTuning.cs EGG_MASS
  lightbug: 1, // LightBugTuning.cs EGG_MASS
  squirrel: 2, // SquirrelTuning.cs EGG_MASS
  mole: 2, // MoleTuning.cs EGG_MASS
  crab: 2, // CrabTuning.cs EGG_MASS
  divergent: 2, // DivergentTuning.cs EGG_MASS
  stego: 8, // StegoTuning.cs EGG_MASS (also the literal 8f in StegoConfig/AlgaeStegoConfig)
  chameleon: 2, // ChameleonTuning.cs EGG_MASS
  raptor: 8, // RaptorTuning.cs EGG_MASS (literal 8f in RaptorConfig)
  seal: 2, // SealTuning.cs EGG_MASS
  deer: 2, // DeerTuning.cs EGG_MASS
} as const

// Hatch diets (BaseHatchConfig.cs)
const HATCH_SOFT_ROCK = [
  'Sand',
  'SandStone',
  'Clay',
  'CrushedRock',
  'Dirt',
  'SedimentaryRock',
  'Shale',
  'SiltStone',
  'Coquina',
] // BaseHatchConfig.BasicRockDiet
const HATCH_HARD_ROCK = ['SedimentaryRock', 'IgneousRock', 'Obsidian', 'Granite', 'Basalt'] // BaseHatchConfig.HardRockDiet
const HATCH_VEGGIE_SOLIDS = [
  'Dirt',
  'SlimeMold',
  'Algae',
  'Fertilizer',
  'ToxicSand',
  'ToxicMud',
  'Corallium',
] // BaseHatchConfig.VeggieDiet
const HATCH_METAL_ORES = [
  'GameTags.BasicMetalOres (each basic metal ore)',
  'GoldAmalgam',
  'Wolframite',
] // BaseHatchConfig.MetalDiet
const HATCH_FOOD_NOTE =
  'BaseHatchConfig.FoodDiet: one Diet.Info per EdiblesManager food with CaloriesPerUnit > 0, calories per unit = that food CaloriesPerUnit (TUNING/FOOD.cs). Per-food list not expanded here.'

const SHELL_DEFAULT = 0.5 // EntityTemplates.ExtendEntityToFertileCreature overload: eggShellRatio = 0.5f

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

export const ranchSpecies: RanchSpecies[] = [
  // ===================================================================== Hatch
  {
    id: 'Hatch',
    name: 'Hatch',
    family: 'Hatch',
    spacePerCritter: SPACE.TIER3, // HatchTuning.PEN_SIZE_PER_CREATURE = SPACE_REQUIREMENTS.TIER3
    lifespanCycles: 100, // HatchConfig.cs Age.maxAttribute 100f
    caloriesPerCycle: CAL.hatch, // HatchConfig.cs -HatchTuning.STANDARD_CALORIES_PER_CYCLE / 600f
    diet: [
      {
        eats: HATCH_SOFT_ROCK,
        foodType: 'EatSolid',
        caloriesPerKg: CAL.hatch / 140, // HatchConfig.CALORIES_PER_KG_OF_ORE = 700000 / KG_ORE_EATEN_PER_CYCLE (140)
        kgPerCycle: 140, // HatchConfig.KG_ORE_EATEN_PER_CYCLE
        produces: { item: 'Carbon', ratio: CONV.NORMAL, kgPerCycle: 140 * CONV.NORMAL }, // BasicRockDiet(..., CONVERSION_EFFICIENCY.NORMAL)
      },
      {
        eats: ['<all foods>'],
        foodType: 'EatSolid',
        produces: { item: 'Carbon', ratio: CONV.GOOD_1 }, // FoodDiet(..., CONVERSION_EFFICIENCY.GOOD_1)
        note: HATCH_FOOD_NOTE,
      },
    ],
    products: [
      {
        item: 'Meat',
        amountKg: 2,
        note: 'BaseHatchConfig.cs ExtendEntityToBasicCreature onDeathDropID "Meat", count 2f (MeatConfig mass 1f)',
      },
      {
        item: 'HatchEgg',
        perCycle: 1 / 60,
        note: 'one egg per fertilityCycles (60); egg type rolled from HatchTuning.EGG_CHANCES_BASE',
      },
    ],
    egg: {
      id: 'HatchEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.hatch,
      shellRatio: SHELL_DEFAULT,
    }, // HatchConfig.cs 60.000004f, 20f; 60.000004f is 0.6f * 100 in float32
    cite: ['HatchConfig.cs', 'BaseHatchConfig.cs', 'HatchTuning.cs', 'TUNING/CREATURES.cs'],
  },
  {
    id: 'HatchHard',
    name: 'Stone Hatch',
    family: 'Hatch',
    spacePerCritter: SPACE.TIER3, // HatchTuning.PEN_SIZE_PER_CREATURE
    lifespanCycles: 100, // HatchHardConfig.cs Age.maxAttribute 100f
    caloriesPerCycle: CAL.hatch, // HatchHardConfig.cs
    diet: [
      {
        eats: HATCH_HARD_ROCK,
        foodType: 'EatSolid',
        caloriesPerKg: CAL.hatch / 140, // HatchHardConfig.CALORIES_PER_KG_OF_ORE = 700000 / 140
        kgPerCycle: 140, // HatchHardConfig.KG_ORE_EATEN_PER_CYCLE
        produces: { item: 'Carbon', ratio: CONV.NORMAL, kgPerCycle: 140 * CONV.NORMAL }, // HardRockDiet(..., NORMAL)
      },
      {
        eats: HATCH_METAL_ORES,
        foodType: 'EatSolid',
        caloriesPerKg: CAL.hatch / 140,
        kgPerCycle: 140,
        produces: { item: 'Carbon', ratio: CONV.BAD_1, kgPerCycle: 140 * CONV.BAD_1 }, // MetalDiet(Carbon tag, ..., BAD_1)
      },
    ],
    products: [
      { item: 'Meat', amountKg: 2, note: 'BaseHatchConfig.cs onDeathDropCount 2f' },
      { item: 'HatchHardEgg', perCycle: 1 / 60, note: 'one egg per fertilityCycles (60)' },
    ],
    egg: {
      id: 'HatchHardEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.hatch,
      shellRatio: SHELL_DEFAULT,
    }, // HatchHardConfig.cs 60.000004f, 20f
    cite: ['HatchHardConfig.cs', 'BaseHatchConfig.cs', 'HatchTuning.cs'],
  },
  {
    id: 'HatchVeggie',
    name: 'Sage Hatch',
    family: 'Hatch',
    spacePerCritter: SPACE.TIER3,
    lifespanCycles: 100, // HatchVeggieConfig.cs Age.maxAttribute 100f
    caloriesPerCycle: CAL.hatch,
    diet: [
      {
        eats: HATCH_VEGGIE_SOLIDS,
        foodType: 'EatSolid',
        caloriesPerKg: CAL.hatch / 140, // HatchVeggieConfig.CALORIES_PER_KG_OF_ORE
        kgPerCycle: 140, // HatchVeggieConfig.KG_ORE_EATEN_PER_CYCLE
        produces: { item: 'Carbon', ratio: CONV.GOOD_3, kgPerCycle: 140 * CONV.GOOD_3 }, // VeggieDiet(..., GOOD_3)
      },
      {
        eats: ['<all foods>'],
        foodType: 'EatSolid',
        produces: { item: 'Carbon', ratio: CONV.GOOD_3 }, // FoodDiet(..., GOOD_3)
        note: HATCH_FOOD_NOTE,
      },
    ],
    products: [
      { item: 'Meat', amountKg: 2, note: 'BaseHatchConfig.cs onDeathDropCount 2f' },
      { item: 'HatchVeggieEgg', perCycle: 1 / 60, note: 'one egg per fertilityCycles (60)' },
    ],
    egg: {
      id: 'HatchVeggieEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.hatch,
      shellRatio: SHELL_DEFAULT,
    }, // HatchVeggieConfig.cs
    cite: ['HatchVeggieConfig.cs', 'BaseHatchConfig.cs', 'HatchTuning.cs'],
  },
  {
    id: 'HatchMetal',
    name: 'Smooth Hatch',
    family: 'Hatch',
    spacePerCritter: SPACE.TIER3,
    lifespanCycles: 100, // HatchMetalConfig.cs Age.maxAttribute 100f
    caloriesPerCycle: CAL.hatch,
    diet: [
      {
        eats: HATCH_METAL_ORES,
        foodType: 'EatSolid',
        caloriesPerKg: CAL.hatch / 100, // HatchMetalConfig.CALORIES_PER_KG_OF_ORE = 700000 / KG_ORE_EATEN_PER_CYCLE (100)
        kgPerCycle: 100, // HatchMetalConfig.KG_ORE_EATEN_PER_CYCLE
        produces: {
          item: 'Refined metal (Element.refinedMetalTarget of the ore; GoldAmalgam->Gold, Wolframite->Tungsten)',
          ratio: CONV.GOOD_1,
          kgPerCycle: 100 * CONV.GOOD_1,
        }, // MetalDiet(GameTags.Metal, ..., GOOD_1)
      },
    ],
    products: [
      { item: 'Meat', amountKg: 2, note: 'BaseHatchConfig.cs onDeathDropCount 2f' },
      { item: 'HatchMetalEgg', perCycle: 1 / 60, note: 'one egg per fertilityCycles (60)' },
    ],
    egg: {
      id: 'HatchMetalEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.hatch,
      shellRatio: SHELL_DEFAULT,
    }, // HatchMetalConfig.cs
    cite: ['HatchMetalConfig.cs', 'BaseHatchConfig.cs', 'HatchTuning.cs'],
  },

  // ===================================================================== Puft
  {
    id: 'Puft',
    name: 'Puft',
    family: 'Puft',
    spacePerCritter: SPACE.TIER4, // PuftTuning.PEN_SIZE_PER_CREATURE = TIER4
    lifespanCycles: 75, // PuftConfig.cs Age.maxAttribute 75f
    caloriesPerCycle: CAL.puft,
    diet: [
      {
        eats: ['ContaminatedOxygen'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.puft / 50, // PuftConfig.CALORIES_PER_KG_OF_ORE = 200000 / KG_ORE_EATEN_PER_CYCLE (50)
        kgPerCycle: 50, // PuftConfig.KG_ORE_EATEN_PER_CYCLE
        produces: { item: 'SlimeMold', ratio: CONV.GOOD_2, kgPerCycle: 50 * CONV.GOOD_2 }, // BasePuftConfig.SetupDiet(..., GOOD_2, "SlimeLung")
        note: 'Poop carries SlimeLung (diseasePerKg 0 in Diet.Info; alwaysShowDisease SlimeLung)',
      },
    ],
    products: [
      { item: 'Meat', amountKg: 1, note: 'BasePuftConfig.cs onDeathDropCount 1f' },
      { item: 'PuftEgg', perCycle: 1 / 45, note: 'one egg per fertilityCycles (45)' },
    ],
    egg: {
      id: 'PuftEgg',
      fertilityCycles: 45,
      incubationCycles: 15,
      massKg: EGG_MASS.puft,
      shellRatio: SHELL_DEFAULT,
    }, // PuftConfig.cs 45f, 15f
    cite: ['PuftConfig.cs', 'BasePuftConfig.cs', 'PuftTuning.cs'],
  },
  {
    id: 'PuftAlpha',
    name: 'Puft Prince',
    family: 'Puft',
    spacePerCritter: SPACE.TIER4,
    lifespanCycles: 75, // PuftAlphaConfig.cs Age.maxAttribute 75f
    caloriesPerCycle: CAL.puft,
    diet: [
      {
        eats: ['ContaminatedOxygen'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.puft / 30, // PuftAlphaConfig.CALORIES_PER_KG_OF_ORE = 200000 / KG_ORE_EATEN_PER_CYCLE (30)
        kgPerCycle: 30,
        produces: { item: 'SlimeMold', ratio: CONV.BAD_2, kgPerCycle: 30 * CONV.BAD_2 },
      },
      {
        eats: ['ChlorineGas'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.puft / 30,
        kgPerCycle: 30,
        produces: { item: 'BleachStone', ratio: CONV.BAD_2, kgPerCycle: 30 * CONV.BAD_2 },
      },
      {
        eats: ['Oxygen'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.puft / 30,
        kgPerCycle: 30,
        produces: { item: 'OxyRock', ratio: CONV.BAD_2, kgPerCycle: 30 * CONV.BAD_2 },
      },
    ],
    products: [
      { item: 'Meat', amountKg: 1, note: 'BasePuftConfig.cs onDeathDropCount 1f' },
      { item: 'PuftAlphaEgg', perCycle: 1 / 45, note: 'one egg per fertilityCycles (45)' },
    ],
    egg: {
      id: 'PuftAlphaEgg',
      fertilityCycles: 45,
      incubationCycles: 15,
      massKg: EGG_MASS.puft,
      shellRatio: SHELL_DEFAULT,
    }, // PuftAlphaConfig.cs
    cite: ['PuftAlphaConfig.cs', 'BasePuftConfig.cs', 'PuftTuning.cs'],
  },
  {
    id: 'PuftOxylite',
    name: 'Dense Puft',
    family: 'Puft',
    spacePerCritter: SPACE.TIER4,
    lifespanCycles: 75, // PuftOxyliteConfig.cs
    caloriesPerCycle: CAL.puft,
    diet: [
      {
        eats: ['Oxygen'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.puft / 50, // PuftOxyliteConfig.KG_ORE_EATEN_PER_CYCLE = 50
        kgPerCycle: 50,
        produces: { item: 'OxyRock', ratio: CONV.GOOD_2, kgPerCycle: 50 * CONV.GOOD_2 },
      },
    ],
    products: [
      { item: 'Meat', amountKg: 1, note: 'BasePuftConfig.cs onDeathDropCount 1f' },
      { item: 'PuftOxyliteEgg', perCycle: 1 / 45, note: 'one egg per fertilityCycles (45)' },
    ],
    egg: {
      id: 'PuftOxyliteEgg',
      fertilityCycles: 45,
      incubationCycles: 15,
      massKg: EGG_MASS.puft,
      shellRatio: SHELL_DEFAULT,
    },
    cite: ['PuftOxyliteConfig.cs', 'BasePuftConfig.cs', 'PuftTuning.cs'],
  },
  {
    id: 'PuftBleachstone',
    name: 'Squeaky Puft',
    family: 'Puft',
    spacePerCritter: SPACE.TIER4,
    lifespanCycles: 75, // PuftBleachstoneConfig.cs
    caloriesPerCycle: CAL.puft,
    diet: [
      {
        eats: ['ChlorineGas'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.puft / 30, // PuftBleachstoneConfig.KG_ORE_EATEN_PER_CYCLE = 30
        kgPerCycle: 30,
        produces: { item: 'BleachStone', ratio: CONV.GOOD_2, kgPerCycle: 30 * CONV.GOOD_2 },
      },
    ],
    products: [
      { item: 'Meat', amountKg: 1, note: 'BasePuftConfig.cs onDeathDropCount 1f' },
      { item: 'PuftBleachstoneEgg', perCycle: 1 / 45, note: 'one egg per fertilityCycles (45)' },
    ],
    egg: {
      id: 'PuftBleachstoneEgg',
      fertilityCycles: 45,
      incubationCycles: 15,
      massKg: EGG_MASS.puft,
      shellRatio: SHELL_DEFAULT,
    },
    cite: ['PuftBleachstoneConfig.cs', 'BasePuftConfig.cs', 'PuftTuning.cs'],
  },

  // ===================================================================== Drecko
  {
    id: 'Drecko',
    name: 'Drecko',
    family: 'Drecko',
    spacePerCritter: SPACE.TIER3, // DreckoTuning.PEN_SIZE_PER_CREATURE
    lifespanCycles: 150, // DreckoConfig.cs Age.maxAttribute 150f
    caloriesPerCycle: CAL.drecko,
    diet: [
      {
        eats: ['SpiceVine', 'SwampLily', 'BasicSingleHarvestPlant'], // DreckoConfig.cs Diet.Info tags (SwampLilyConfig.ID = "SwampLily")
        foodType: 'EatPlantDirectly',
        plantGrowthCyclesPerCycle: 0.75, // DreckoConfig.DAYS_PLANT_GROWTH_EATEN_PER_CYCLE
        caloriesPerPlantGrowthCycle: CAL.drecko / 0.75, // DreckoConfig.CALORIES_PER_DAY_OF_PLANT_EATEN
        produces: { item: 'Phosphorite', ratio: 13.33, kgPerCycle: 0.75 * 13.33 }, // DreckoConfig.KG_POOP_PER_DAY_OF_PLANT = 13.33 per plant-growth cycle
      },
    ],
    products: [
      { item: 'Meat', amountKg: 2, note: 'BaseDreckoConfig.cs onDeathDropCount 2f' },
      {
        item: 'BasicFabric',
        amountKg: 0.25 * 8,
        perCycle: 0.25,
        note: 'Shearing: ScaleGrowthMonitor dropMass = FIBER_PER_CYCLE (0.25) * SCALE_GROWTH_TIME_IN_CYCLES (8) = 2 kg per full coat; needs Hydrogen atmosphere (targetAtmosphere)',
      },
      { item: 'DreckoEgg', perCycle: 1 / 90, note: 'one egg per fertilityCycles (90)' },
    ],
    egg: {
      id: 'DreckoEgg',
      fertilityCycles: 90,
      incubationCycles: 30,
      massKg: EGG_MASS.drecko,
      shellRatio: SHELL_DEFAULT,
    }, // DreckoConfig.cs 90f, 30f
    cite: ['DreckoConfig.cs', 'BaseDreckoConfig.cs', 'DreckoTuning.cs'],
  },
  {
    id: 'DreckoPlastic',
    name: 'Glossy Drecko',
    family: 'Drecko',
    spacePerCritter: SPACE.TIER3,
    lifespanCycles: 150, // DreckoPlasticConfig.cs Age.maxAttribute 150f
    caloriesPerCycle: CAL.drecko,
    diet: [
      {
        eats: ['BasicSingleHarvestPlant', 'PrickleFlower'], // DreckoPlasticConfig.cs Diet.Info tags
        foodType: 'EatPlantDirectly',
        plantGrowthCyclesPerCycle: 1, // DreckoPlasticConfig.DAYS_PLANT_GROWTH_EATEN_PER_CYCLE
        caloriesPerPlantGrowthCycle: CAL.drecko / 1,
        produces: { item: 'Phosphorite', ratio: 9, kgPerCycle: 1 * 9 }, // DreckoPlasticConfig.KG_POOP_PER_DAY_OF_PLANT = 9
      },
    ],
    products: [
      { item: 'Meat', amountKg: 2, note: 'BaseDreckoConfig.cs onDeathDropCount 2f' },
      {
        item: 'Polypropylene',
        amountKg: 50 * 3,
        perCycle: 50,
        note: 'Shearing: dropMass = PLASTIC_PER_CYCLE (50) * SCALE_GROWTH_TIME_IN_CYCLES (3) = 150 kg per full coat; needs Hydrogen atmosphere',
      },
      { item: 'DreckoPlasticEgg', perCycle: 1 / 90, note: 'one egg per fertilityCycles (90)' },
    ],
    egg: {
      id: 'DreckoPlasticEgg',
      fertilityCycles: 90,
      incubationCycles: 30,
      massKg: EGG_MASS.drecko,
      shellRatio: SHELL_DEFAULT,
    },
    cite: ['DreckoPlasticConfig.cs', 'BaseDreckoConfig.cs', 'DreckoTuning.cs'],
  },

  // ===================================================================== Pacu (fish: counted per pond, not per stable room)
  {
    id: 'Pacu',
    name: 'Pacu',
    family: 'Pacu',
    spacePerCritter: SPACE.TIER2, // PacuTuning.PEN_SIZE_PER_CREATURE; fish are counted in water cells of the pond (FishOvercrowdingMonitor), not in a Stable
    lifespanCycles: 25, // BasePacuConfig.cs Age.maxAttribute 25f (shared by all Pacu morphs)
    caloriesPerCycle: CAL.pacu, // BasePacuConfig.cs -PacuTuning.STANDARD_CALORIES_PER_CYCLE / 600f
    diet: [
      {
        eats: ['Algae'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.pacu / 7.5, // BasePacuConfig.CALORIES_PER_KG_OF_ORE = 100000 / KG_ORE_EATEN_PER_CYCLE (7.5)
        kgPerCycle: 7.5,
        produces: { item: 'ToxicSand', ratio: CONV.GOOD_0, kgPerCycle: 7.5 * CONV.GOOD_0 },
      },
      {
        eats: ['FishFood'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.pacu, // BasePacuConfig: Diet.Info(..., PacuTuning.STANDARD_CALORIES_PER_CYCLE, 6f)
        kgPerCycle: 1,
        produces: { item: 'ToxicSand', ratio: 6, kgPerCycle: 6 },
        note: 'Eating FishFood also triggers the AteWellPreparedFishFood effect (BasePacuConfig.SubscribeFishFoodEffect)',
      },
      {
        eats: [
          '<every plantable seed whose plant is Harvest / Crop / HarvestOnly, excluding KelpPlantSeed>',
        ],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.pacu, // BasePacuConfig.SeedDiet(tag, STANDARD_CALORIES_PER_CYCLE, 3f)
        kgPerCycle: 1,
        produces: { item: 'ToxicSand', ratio: 3, kgPerCycle: 3 },
      },
      {
        eats: ['Kelp'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.pacu / 20, // BasePacuConfig.CALORIES_PER_KG_OF_KELP = 100000 / KG_KELP_EATEN_PER_CYCLE (20)
        kgPerCycle: 20,
        produces: { item: 'ToxicSand', ratio: CONV.NORMAL, kgPerCycle: 20 * CONV.NORMAL }, // KELP_TO_PRODUCT_EFFICIENCY = NORMAL
        dlcIds: ['DLC4_ID'], // added only when DlcManager.GetActiveDLCIds() contains DLC4_ID
      },
    ],
    products: [
      {
        item: 'FishMeat',
        amountKg: 1,
        note: 'BasePacuConfig.cs onDeathDropID "FishMeat", count 1f (FishMeatConfig mass 1f)',
      },
      { item: 'PacuEgg', perCycle: 1 / 15, note: 'one egg per fertilityCycles (15)' },
    ],
    egg: {
      id: 'PacuEgg',
      fertilityCycles: 15,
      incubationCycles: 5,
      massKg: EGG_MASS.pacu,
      shellRatio: 0,
    }, // PacuConfig.cs 15.000001f, 5f; PacuTuning.EGG_SHELL_RATIO = 0f
    cite: ['PacuConfig.cs', 'BasePacuConfig.cs', 'PacuTuning.cs'],
  },
  {
    id: 'PacuTropical',
    name: 'Tropical Pacu',
    family: 'Pacu',
    spacePerCritter: SPACE.TIER2,
    lifespanCycles: 25, // BasePacuConfig.cs
    caloriesPerCycle: CAL.pacu,
    diet: [
      {
        eats: ['Algae'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.pacu / 7.5,
        kgPerCycle: 7.5,
        produces: { item: 'ToxicSand', ratio: CONV.GOOD_0, kgPerCycle: 7.5 * CONV.GOOD_0 },
        note: 'Same diet table as Pacu (shared BasePacuConfig.CreatePrefab); FishFood, seed and DLC4 Kelp entries identical',
      },
    ],
    products: [
      { item: 'FishMeat', amountKg: 1, note: 'BasePacuConfig.cs count 1f' },
      { item: 'PacuTropicalEgg', perCycle: 1 / 15, note: 'one egg per fertilityCycles (15)' },
    ],
    egg: {
      id: 'PacuTropicalEgg',
      fertilityCycles: 15,
      incubationCycles: 5,
      massKg: EGG_MASS.pacu,
      shellRatio: 0,
    }, // PacuTropicalConfig.cs
    cite: ['PacuTropicalConfig.cs', 'BasePacuConfig.cs', 'PacuTuning.cs'],
  },
  {
    id: 'PacuCleaner',
    name: 'Gulp Fish',
    family: 'Pacu',
    spacePerCritter: SPACE.TIER2,
    lifespanCycles: 25, // BasePacuConfig.cs
    caloriesPerCycle: CAL.pacu,
    diet: [
      {
        eats: ['Algae'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.pacu / 7.5,
        kgPerCycle: 7.5,
        produces: { item: 'ToxicSand', ratio: CONV.GOOD_0, kgPerCycle: 7.5 * CONV.GOOD_0 },
        note: 'Same diet table as Pacu (shared BasePacuConfig.CreatePrefab)',
      },
    ],
    products: [
      { item: 'FishMeat', amountKg: 1, note: 'BasePacuConfig.cs count 1f' },
      {
        item: 'Water',
        perCycle: 120,
        note: 'PacuCleanerConfig: consumes DirtyWater and emits Water at 0.2 kg/s = 120 kg/cycle (POLLUTED_WATER_CONVERTED_PER_CYCLE); ElementConverter 0.2',
      },
      { item: 'PacuCleanerEgg', perCycle: 1 / 15, note: 'one egg per fertilityCycles (15)' },
    ],
    egg: {
      id: 'PacuCleanerEgg',
      fertilityCycles: 15,
      incubationCycles: 5,
      massKg: EGG_MASS.pacu,
      shellRatio: 0,
    }, // PacuCleanerConfig.cs
    cite: ['PacuCleanerConfig.cs', 'BasePacuConfig.cs', 'PacuTuning.cs'],
  },

  // ===================================================================== Slickster (prefab ids use a lowercase f)
  {
    id: 'Oilfloater',
    name: 'Slickster',
    family: 'Oilfloater',
    spacePerCritter: SPACE.TIER3, // OilFloaterTuning.PEN_SIZE_PER_CREATURE
    lifespanCycles: 100, // OilFloaterConfig.cs Age.maxAttribute 100f
    caloriesPerCycle: CAL.oilfloater,
    diet: [
      {
        eats: ['CarbonDioxide'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.oilfloater / 20, // OilFloaterConfig.CALORIES_PER_KG_OF_ORE = 120000 / KG_ORE_EATEN_PER_CYCLE (20)
        kgPerCycle: 20,
        produces: { item: 'CrudeOil', ratio: CONV.NORMAL, kgPerCycle: 20 * CONV.NORMAL },
      },
    ],
    products: [
      { item: 'Meat', amountKg: 2, note: 'BaseOilFloaterConfig.cs onDeathDropCount 2f' },
      { item: 'OilfloaterEgg', perCycle: 1 / 60, note: 'one egg per fertilityCycles (60)' },
    ],
    egg: {
      id: 'OilfloaterEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.oilfloater,
      shellRatio: SHELL_DEFAULT,
    }, // OilFloaterConfig.cs 60.000004f, 20f
    cite: ['OilFloaterConfig.cs', 'BaseOilFloaterConfig.cs', 'OilFloaterTuning.cs'],
  },
  {
    id: 'OilfloaterHighTemp',
    name: 'Molten Slickster',
    family: 'Oilfloater',
    spacePerCritter: SPACE.TIER3,
    lifespanCycles: 100, // OilFloaterHighTempConfig.cs
    caloriesPerCycle: CAL.oilfloater,
    diet: [
      {
        eats: ['CarbonDioxide'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.oilfloater / 20,
        kgPerCycle: 20, // OilFloaterHighTempConfig.KG_ORE_EATEN_PER_CYCLE
        produces: { item: 'Petroleum', ratio: CONV.NORMAL, kgPerCycle: 20 * CONV.NORMAL },
      },
    ],
    products: [
      { item: 'Meat', amountKg: 2, note: 'BaseOilFloaterConfig.cs onDeathDropCount 2f' },
      { item: 'OilfloaterHighTempEgg', perCycle: 1 / 60, note: 'one egg per fertilityCycles (60)' },
    ],
    egg: {
      id: 'OilfloaterHighTempEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.oilfloater,
      shellRatio: SHELL_DEFAULT,
    },
    cite: ['OilFloaterHighTempConfig.cs', 'BaseOilFloaterConfig.cs', 'OilFloaterTuning.cs'],
  },
  {
    id: 'OilfloaterDecor',
    name: 'Longhair Slickster',
    family: 'Oilfloater',
    spacePerCritter: SPACE.TIER3,
    lifespanCycles: 150, // OilFloaterDecorConfig.cs Age.maxAttribute 150f
    caloriesPerCycle: CAL.oilfloater,
    diet: [
      {
        eats: ['Oxygen'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.oilfloater / 30, // OilFloaterDecorConfig.KG_ORE_EATEN_PER_CYCLE = 30
        kgPerCycle: 30,
        note: 'Produces nothing: SetupDiet(..., Tag.Invalid, conversionRate 0)',
      },
    ],
    products: [
      { item: 'Meat', amountKg: 2, note: 'BaseOilFloaterConfig.cs onDeathDropCount 2f' },
      { item: 'OilfloaterDecorEgg', perCycle: 1 / 90, note: 'one egg per fertilityCycles (90)' },
    ],
    egg: {
      id: 'OilfloaterDecorEgg',
      fertilityCycles: 90,
      incubationCycles: 30,
      massKg: EGG_MASS.oilfloater,
      shellRatio: SHELL_DEFAULT,
    }, // OilFloaterDecorConfig.cs 90f, 30f
    cite: ['OilFloaterDecorConfig.cs', 'BaseOilFloaterConfig.cs', 'OilFloaterTuning.cs'],
  },

  // ===================================================================== Shine Bug (LightBug)
  // All morphs: spacePerCritter = LightBugTuning.PEN_SIZE_PER_CREATURE = TIER3 / 2 (int division = 6).
  // Nothing is produced (Diet.Info producedElement Tag.Invalid, rate 1). No meat (BaseLightBug onDeathDropID "", 0f).
  {
    id: 'LightBug',
    name: 'Shine Bug',
    family: 'LightBug',
    spacePerCritter: SPACE.TIER3 / 2,
    lifespanCycles: 25, // LightBugConfig.cs Age.maxAttribute 25f
    caloriesPerCycle: CAL.lightbug,
    diet: [
      {
        eats: ['PrickleFruit', 'GrilledPrickleFruit', 'Phosphorite'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.lightbug / 0.166, // LightBugConfig.CALORIES_PER_KG_OF_ORE = 40000 / KG_ORE_EATEN_PER_CYCLE (0.166)
        kgPerCycle: 0.166,
        note: 'Also HardSkinBerry and CookedPikeapple when DLC2_ID is subscribed (LightBugConfig.cs)',
      },
    ],
    products: [
      {
        item: 'NaturalResin',
        amountKg: 5,
        note: 'BaseLightBugConfig: EggConfig.CUSTOM_EGG_OUTPUTS[id + "Baby"] = NaturalResin 5; an egg cracker output for the egg, not a critter drop',
      },
      { item: 'LightBugEgg', perCycle: 1 / 15, note: 'one egg per fertilityCycles (15)' },
    ],
    egg: {
      id: 'LightBugEgg',
      fertilityCycles: 15,
      incubationCycles: 5,
      massKg: EGG_MASS.lightbug,
      shellRatio: SHELL_DEFAULT,
    }, // LightBugConfig.cs 15.000001f, 5f
    cite: ['LightBugConfig.cs', 'BaseLightBugConfig.cs', 'LightBugTuning.cs'],
  },
  {
    id: 'LightBugOrange',
    name: 'Sun Bug',
    family: 'LightBug',
    spacePerCritter: SPACE.TIER3 / 2,
    lifespanCycles: 25, // LightBugOrangeConfig.cs
    caloriesPerCycle: CAL.lightbug,
    diet: [
      {
        eats: ['Mushroom', 'FriedMushroom', 'GrilledPrickleFruit', 'Phosphorite'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.lightbug / 0.25, // LightBugOrangeConfig.KG_ORE_EATEN_PER_CYCLE = 0.25
        kgPerCycle: 0.25,
        note: 'Also CookedPikeapple when DLC2_ID is subscribed',
      },
    ],
    products: [
      { item: 'LightBugOrangeEgg', perCycle: 1 / 15, note: 'one egg per fertilityCycles (15)' },
    ],
    egg: {
      id: 'LightBugOrangeEgg',
      fertilityCycles: 15,
      incubationCycles: 5,
      massKg: EGG_MASS.lightbug,
      shellRatio: SHELL_DEFAULT,
    },
    cite: ['LightBugOrangeConfig.cs', 'BaseLightBugConfig.cs', 'LightBugTuning.cs'],
  },
  {
    id: 'LightBugPurple',
    name: 'Royal Bug',
    family: 'LightBug',
    spacePerCritter: SPACE.TIER3 / 2,
    lifespanCycles: 25, // LightBugPurpleConfig.cs
    caloriesPerCycle: CAL.lightbug,
    diet: [
      {
        eats: ['FriedMushroom', 'GrilledPrickleFruit', 'SpiceNut', 'SpiceBread', 'Phosphorite'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.lightbug / 1, // LightBugPurpleConfig.KG_ORE_EATEN_PER_CYCLE = 1
        kgPerCycle: 1,
        note: 'Also CookedPikeapple when DLC2_ID is subscribed',
      },
    ],
    products: [
      { item: 'LightBugPurpleEgg', perCycle: 1 / 15, note: 'one egg per fertilityCycles (15)' },
    ],
    egg: {
      id: 'LightBugPurpleEgg',
      fertilityCycles: 15,
      incubationCycles: 5,
      massKg: EGG_MASS.lightbug,
      shellRatio: SHELL_DEFAULT,
    },
    cite: ['LightBugPurpleConfig.cs', 'BaseLightBugConfig.cs', 'LightBugTuning.cs'],
  },
  {
    id: 'LightBugPink',
    name: 'Coral Bug',
    family: 'LightBug',
    spacePerCritter: SPACE.TIER3 / 2,
    lifespanCycles: 25, // LightBugPinkConfig.cs
    caloriesPerCycle: CAL.lightbug,
    diet: [
      {
        eats: [
          'FriedMushroom',
          'SpiceBread',
          'PrickleFruit',
          'GrilledPrickleFruit',
          'Salsa',
          'Phosphorite',
        ],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.lightbug / 1, // LightBugPinkConfig.KG_ORE_EATEN_PER_CYCLE = 1
        kgPerCycle: 1,
        note: 'Also CookedPikeapple when DLC2_ID is subscribed',
      },
    ],
    products: [
      { item: 'LightBugPinkEgg', perCycle: 1 / 15, note: 'one egg per fertilityCycles (15)' },
    ],
    egg: {
      id: 'LightBugPinkEgg',
      fertilityCycles: 15,
      incubationCycles: 5,
      massKg: EGG_MASS.lightbug,
      shellRatio: SHELL_DEFAULT,
    },
    cite: ['LightBugPinkConfig.cs', 'BaseLightBugConfig.cs', 'LightBugTuning.cs'],
  },
  {
    id: 'LightBugBlue',
    name: 'Azure Bug',
    family: 'LightBug',
    spacePerCritter: SPACE.TIER3 / 2,
    lifespanCycles: 25, // LightBugBlueConfig.cs
    caloriesPerCycle: CAL.lightbug,
    diet: [
      {
        eats: ['SpiceBread', 'Salsa', 'Phosphorite', 'Phosphorus'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.lightbug / 1, // LightBugBlueConfig.KG_ORE_EATEN_PER_CYCLE = 1
        kgPerCycle: 1,
      },
    ],
    products: [
      { item: 'LightBugBlueEgg', perCycle: 1 / 15, note: 'one egg per fertilityCycles (15)' },
    ],
    egg: {
      id: 'LightBugBlueEgg',
      fertilityCycles: 15,
      incubationCycles: 5,
      massKg: EGG_MASS.lightbug,
      shellRatio: SHELL_DEFAULT,
    },
    cite: ['LightBugBlueConfig.cs', 'BaseLightBugConfig.cs', 'LightBugTuning.cs'],
  },
  {
    id: 'LightBugBlack',
    name: 'Abyss Bug',
    family: 'LightBug',
    spacePerCritter: SPACE.TIER3 / 2,
    lifespanCycles: 75, // LightBugBlackConfig.cs Age.maxAttribute 75f
    caloriesPerCycle: CAL.lightbug,
    diet: [
      {
        eats: ['Salsa', 'Meat', 'CookedMeat', 'Katairite', 'Phosphorus'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.lightbug / 1, // LightBugBlackConfig.KG_ORE_EATEN_PER_CYCLE = 1
        kgPerCycle: 1,
      },
    ],
    products: [
      { item: 'LightBugBlackEgg', perCycle: 1 / 45, note: 'one egg per fertilityCycles (45)' },
    ],
    egg: {
      id: 'LightBugBlackEgg',
      fertilityCycles: 45,
      incubationCycles: 15,
      massKg: EGG_MASS.lightbug,
      shellRatio: SHELL_DEFAULT,
    }, // LightBugBlackConfig.cs 45f, 15f
    cite: ['LightBugBlackConfig.cs', 'BaseLightBugConfig.cs', 'LightBugTuning.cs'],
  },
  {
    id: 'LightBugCrystal',
    name: 'Radiant Bug',
    family: 'LightBug',
    spacePerCritter: SPACE.TIER3 / 2,
    lifespanCycles: 75, // LightBugCrystalConfig.cs Age.maxAttribute 75f
    caloriesPerCycle: CAL.lightbug,
    diet: [
      {
        eats: ['CookedMeat', 'Diamond'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.lightbug / 1, // LightBugCrystalConfig.KG_ORE_EATEN_PER_CYCLE = 1
        kgPerCycle: 1,
      },
    ],
    products: [
      { item: 'LightBugCrystalEgg', perCycle: 1 / 45, note: 'one egg per fertilityCycles (45)' },
    ],
    egg: {
      id: 'LightBugCrystalEgg',
      fertilityCycles: 45,
      incubationCycles: 15,
      massKg: EGG_MASS.lightbug,
      shellRatio: SHELL_DEFAULT,
    },
    cite: ['LightBugCrystalConfig.cs', 'BaseLightBugConfig.cs', 'LightBugTuning.cs'],
  },

  // ===================================================================== Pip
  {
    id: 'Squirrel',
    name: 'Pip',
    family: 'Squirrel',
    spacePerCritter: SPACE.TIER3, // SquirrelTuning.PEN_SIZE_PER_CREATURE
    lifespanCycles: 100, // SquirrelConfig.cs Age.maxAttribute 100f
    caloriesPerCycle: CAL.squirrel,
    diet: [
      {
        eats: ['ForestTree', 'BasicFabricMaterialPlant'], // BaseSquirrelConfig.BasicDiet (BasicFabricMaterialPlantConfig.ID)
        foodType: 'EatPlantDirectly',
        plantGrowthCyclesPerCycle: 0.4, // SquirrelConfig.DAYS_PLANT_GROWTH_EATEN_PER_CYCLE
        caloriesPerPlantGrowthCycle: CAL.squirrel / 0.4, // SquirrelConfig.CALORIES_PER_DAY_OF_PLANT_EATEN
        produces: { item: 'Dirt', ratio: 50, kgPerCycle: 0.4 * 50 }, // SquirrelConfig.KG_POOP_PER_DAY_OF_PLANT = 50
        note: 'Also SpaceTree (DLC2_ID) and DewPalm (DLC5_ID) when those DLCs are subscribed',
      },
    ],
    products: [
      { item: 'Meat', amountKg: 1, note: 'BaseSquirrelConfig.cs onDeathDropCount 1f' },
      { item: 'SquirrelEgg', perCycle: 1 / 60, note: 'one egg per fertilityCycles (60)' },
    ],
    egg: {
      id: 'SquirrelEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.squirrel,
      shellRatio: SHELL_DEFAULT,
    }, // SquirrelConfig.cs 60.000004f, 20f
    cite: ['SquirrelConfig.cs', 'BaseSquirrelConfig.cs', 'SquirrelTuning.cs'],
  },
  {
    id: 'SquirrelHug',
    name: 'Cuddle Pip',
    family: 'Squirrel',
    spacePerCritter: SPACE.TIER1, // SquirrelTuning.PEN_SIZE_PER_CREATURE_HUG = TIER1
    lifespanCycles: 100, // SquirrelHugConfig.cs Age.maxAttribute 100f
    caloriesPerCycle: CAL.squirrel,
    diet: [
      {
        eats: ['ForestTree', 'BasicFabricMaterialPlant'],
        foodType: 'EatPlantDirectly',
        plantGrowthCyclesPerCycle: 0.5, // SquirrelHugConfig.DAYS_PLANT_GROWTH_EATEN_PER_CYCLE
        caloriesPerPlantGrowthCycle: CAL.squirrel / 0.5,
        produces: { item: 'Dirt', ratio: 25, kgPerCycle: 0.5 * 25 }, // SquirrelHugConfig.KG_POOP_PER_DAY_OF_PLANT = 25
        note: 'Also SpaceTree (DLC2_ID) and DewPalm (DLC5_ID) when those DLCs are subscribed',
      },
    ],
    products: [
      { item: 'Meat', amountKg: 1, note: 'BaseSquirrelConfig.cs onDeathDropCount 1f' },
      { item: 'SquirrelHugEgg', perCycle: 1 / 60, note: 'one egg per fertilityCycles (60)' },
    ],
    egg: {
      id: 'SquirrelHugEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.squirrel,
      shellRatio: SHELL_DEFAULT,
    },
    cite: ['SquirrelHugConfig.cs', 'BaseSquirrelConfig.cs', 'SquirrelTuning.cs'],
  },

  // ===================================================================== Moo (no egg: arrives by Gassy Moo comet)
  {
    id: 'Moo',
    name: 'Gassy Moo',
    family: 'Moo',
    spacePerCritter: SPACE.TIER4, // MooTuning.PEN_SIZE_PER_CREATURE
    lifespanCycles: 75, // MooConfig.cs Age.maxAttribute = MooTuning.STANDARD_LIFESPAN (75f)
    caloriesPerCycle: CAL.moo,
    diet: [
      {
        eats: ['GasGrass'],
        foodType: 'EatPlantDirectly',
        plantGrowthCyclesPerCycle: 2, // MooTuning.DAYS_PLANT_GROWTH_EATEN_PER_CYCLE
        caloriesPerPlantGrowthCycle: CAL.moo / 2, // MooTuning.CALORIES_PER_DAY_OF_PLANT_EATEN
        produces: { item: 'Methane', ratio: 5, kgPerCycle: 2 * 5 }, // MooTuning.KG_POOP_PER_DAY_OF_PLANT = 5
      },
      {
        eats: ['PlantFiber'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.moo / 200, // MooTuning.CALORIES_PER_DAY_OF_SOLID_EATEN = 200000 / KG_SOLIDS_EATEN_PER_DAY (200)
        kgPerCycle: 200,
        produces: { item: 'Methane', ratio: 10 / 200, kgPerCycle: 200 * (10 / 200) }, // MooTuning.POOP_KG_COVERSION_RATE_FOR_SOLID_DIET
      },
    ],
    products: [
      { item: 'Meat', amountKg: 10, note: 'BaseMooConfig.cs onDeathDropCount 10f' },
      {
        item: 'Milk',
        amountKg: 50 * 4,
        perCycle: 50,
        note: 'MilkProductionMonitor (default element Milk): capacity MooTuning.MILK_CAPACITY = MILK_PER_CYCLE (50) * CYCLES_UNTIL_MILKING (4) = 200 kg; MilkProductionMonitor.Def.CaloriesPerCycle = MooTuning.WELLFED_CALORIES_PER_CYCLE (0.9 * 200000); milking needs perk CanUseMilkingStation (Ranching2). The exact production condition (MilkProductionMonitor + "MooWellFed" effect) was not traced to a per-cycle rate',
      },
    ],
    cite: ['MooConfig.cs', 'BaseMooConfig.cs', 'MooTuning.cs', 'ModifierSet.cs'],
    // egg omitted: Moo has no Egg / ExtendEntityToFertileCreature (spawned by GassyMooCometConfig).
  },
  {
    id: 'DieselMoo',
    name: 'Husky Moo',
    family: 'Moo',
    spacePerCritter: SPACE.TIER4,
    lifespanCycles: 75, // DieselMooConfig.cs Age.maxAttribute = MooTuning.STANDARD_LIFESPAN
    caloriesPerCycle: CAL.moo,
    diet: [
      {
        eats: ['GasGrass'],
        foodType: 'EatPlantDirectly',
        plantGrowthCyclesPerCycle: 2,
        caloriesPerPlantGrowthCycle: CAL.moo / 2,
        produces: { item: 'CarbonDioxide', ratio: 5, kgPerCycle: 2 * 5 }, // DieselMooConfig.POOP_ELEMENT = CarbonDioxide
      },
      {
        eats: ['PlantFiber'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.moo / 200,
        kgPerCycle: 200,
        produces: { item: 'CarbonDioxide', ratio: 10 / 200, kgPerCycle: 200 * (10 / 200) },
      },
    ],
    products: [
      { item: 'Meat', amountKg: 10, note: 'BaseMooConfig.cs onDeathDropCount 10f' },
      {
        item: 'RefinedLipid',
        amountKg: 800,
        note: 'DieselMooConfig: MilkProductionMonitor element RefinedLipid, Capacity 800f (MooTuning.DIESEL_PER_CYCLE = 200 per cycle; MooTuning.cs). Milk effect "HuskyMooWellFed" in ModifierSet.cs',
      },
    ],
    cite: ['DieselMooConfig.cs', 'BaseMooConfig.cs', 'MooTuning.cs', 'ModifierSet.cs'],
    // egg omitted: no egg (spawned by DieselMooCometConfig).
  },

  // ===================================================================== Shove Vole (Mole)
  {
    id: 'Mole',
    name: 'Shove Vole',
    family: 'Mole',
    spacePerCritter: 0, // MoleTuning.PEN_SIZE_PER_CREATURE = 0; MoleConfig also sets OvercrowdingMonitor.Def.spaceRequiredPerCreature = 0 (never overcrowded)
    lifespanCycles: 100, // MoleConfig.cs Age.maxAttribute 100f
    caloriesPerCycle: CAL.mole,
    diet: [
      {
        eats: ['Regolith', 'Dirt', 'IronOre'],
        foodType: 'EatSolid',
        caloriesPerKg: 1000, // MoleConfig.CALORIES_PER_KG_OF_DIRT
        kgPerCycle: CAL.mole / 1000,
        produces: {
          item: 'the same element it ate (SimpleOreDiet: poop tag = eaten tag)',
          ratio: CONV.NORMAL,
          kgPerCycle: (CAL.mole / 1000) * CONV.NORMAL,
        },
      },
    ],
    products: [
      {
        item: 'Meat',
        amountKg: 10,
        note: 'BaseMoleConfig.BaseMole(..., on_death_drop_count 10) in MoleConfig.cs',
      },
      { item: 'MoleEgg', perCycle: 1 / 60, note: 'one egg per fertilityCycles (60)' },
    ],
    egg: {
      id: 'MoleEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.mole,
      shellRatio: SHELL_DEFAULT,
    }, // MoleConfig.cs 60.000004f, 20f
    cite: ['MoleConfig.cs', 'BaseMoleConfig.cs', 'MoleTuning.cs'],
  },
  {
    id: 'MoleDelicacy',
    name: 'Delecta Vole',
    family: 'Mole',
    spacePerCritter: 0, // same as Mole (MoleDelicacyConfig.cs OvercrowdingMonitor.Def.spaceRequiredPerCreature = 0)
    lifespanCycles: 100, // MoleDelicacyConfig.cs Age.maxAttribute 100f
    caloriesPerCycle: CAL.mole,
    diet: [
      {
        eats: ['Regolith', 'Dirt', 'IronOre'],
        foodType: 'EatSolid',
        caloriesPerKg: 1000, // MoleDelicacyConfig.CALORIES_PER_KG_OF_DIRT
        kgPerCycle: CAL.mole / 1000,
        produces: {
          item: 'the same element it ate',
          ratio: CONV.NORMAL,
          kgPerCycle: (CAL.mole / 1000) * CONV.NORMAL,
        },
      },
    ],
    products: [
      {
        item: 'Meat',
        amountKg: 5,
        note: 'MoleDelicacyConfig.cs BaseMole(..., on_death_drop_count 5)',
      },
      {
        item: 'GingerConfig',
        amountKg: 1 * 8,
        perCycle: 1,
        note: 'Shearing: dropMass = GINGER_PER_CYCLE (1) * GINGER_GROWTH_TIME_IN_CYCLES (8) = 8 kg per full growth; item id is GingerConfig.ID = "GingerConfig" as coded; growth only while the vole is at 343.15-353.15 K (MIN/MAX_GROWTH_TEMPERATURE)',
      },
      { item: 'MoleDelicacyEgg', perCycle: 1 / 60, note: 'one egg per fertilityCycles (60)' },
    ],
    egg: {
      id: 'MoleDelicacyEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.mole,
      shellRatio: SHELL_DEFAULT,
    },
    cite: ['MoleDelicacyConfig.cs', 'BaseMoleConfig.cs', 'MoleTuning.cs'],
  },

  // ===================================================================== Pokeshell (Crab)
  {
    id: 'Crab',
    name: 'Pokeshell',
    family: 'Crab',
    spacePerCritter: SPACE.TIER3, // CrabTuning.PEN_SIZE_PER_CREATURE
    lifespanCycles: 100, // CrabConfig.cs Age.maxAttribute 100f
    caloriesPerCycle: CAL.crab,
    diet: [
      {
        eats: ['ToxicSand', 'RotPile'], // BaseCrabConfig.BasicDiet
        foodType: 'EatSolid',
        caloriesPerKg: CAL.crab / 70, // CrabConfig.CALORIES_PER_KG_OF_ORE = 100000 / KG_ORE_EATEN_PER_CYCLE (70)
        kgPerCycle: 70,
        produces: { item: 'Sand', ratio: CONV.NORMAL, kgPerCycle: 70 * CONV.NORMAL },
      },
    ],
    products: [
      {
        item: 'CrabShell',
        amountKg: 60,
        note: 'CrabConfig.SHELL_DROP_COUNT = 60f on death (CrabShell mass 1f)',
      },
      {
        item: 'ShellfishMeat',
        amountKg: 1.2,
        note: 'CrabConfig.SHELLFISH_MEAT_DROP_COUNT = 1.2f on death (mass 1f)',
      },
      { item: 'CrabEgg', perCycle: 1 / 60, note: 'one egg per fertilityCycles (60)' },
    ],
    egg: {
      id: 'CrabEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.crab,
      shellRatio: SHELL_DEFAULT,
    }, // CrabConfig.cs 60.000004f, 20f
    cite: ['CrabConfig.cs', 'BaseCrabConfig.cs', 'CrabTuning.cs'],
  },
  {
    id: 'CrabWood',
    name: 'Oakshell',
    family: 'Crab',
    spacePerCritter: SPACE.TIER3,
    lifespanCycles: 100, // CrabWoodConfig.cs Age.maxAttribute 100f
    caloriesPerCycle: CAL.crab,
    diet: [
      {
        eats: ['ToxicSand', 'RotPile', 'SlimeMold'], // BaseCrabConfig.DietWithSlime
        foodType: 'EatSolid',
        caloriesPerKg: CAL.crab / 70,
        kgPerCycle: 70,
        produces: { item: 'Sand', ratio: CONV.BAD_1, kgPerCycle: 70 * CONV.BAD_1 },
      },
    ],
    products: [
      {
        item: 'CrabWoodShell',
        amountKg: 500,
        note: 'CrabWoodConfig.SHELL_DROP_COUNT = 500f on death',
      },
      {
        item: 'ShellfishMeat',
        amountKg: 1.2,
        note: 'CrabWoodConfig.SHELLFISH_MEAT_DROP_COUNT = 1.2f on death',
      },
      {
        item: 'CrabWoodShell',
        amountKg: 100,
        note: 'Molting: MoltDropperMonitor massToDrop 100f when happy, not hungry, not in Ethanol, and >600 s since the last drop (CrabTuning.IsReadyToMolt)',
      },
      { item: 'CrabWoodEgg', perCycle: 1 / 60, note: 'one egg per fertilityCycles (60)' },
    ],
    egg: {
      id: 'CrabWoodEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.crab,
      shellRatio: SHELL_DEFAULT,
    },
    cite: ['CrabWoodConfig.cs', 'BaseCrabConfig.cs', 'CrabTuning.cs'],
  },
  {
    id: 'CrabFreshWater',
    name: 'Sanishell',
    family: 'Crab',
    spacePerCritter: SPACE.TIER3,
    lifespanCycles: 100, // CrabFreshWaterConfig.cs Age.maxAttribute 100f
    caloriesPerCycle: CAL.crab,
    diet: [
      {
        eats: ['ToxicSand', 'RotPile', 'SlimeMold'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.crab / 15, // CrabFreshWaterConfig.CALORIES_PER_KG_OF_ORE = 100000 / KG_ORE_EATEN_PER_CYCLE (15)
        kgPerCycle: 15,
        produces: { item: 'Sand', ratio: CONV.GOOD_0, kgPerCycle: 15 * CONV.GOOD_0 },
      },
    ],
    products: [
      {
        item: 'ShellfishMeat',
        amountKg: 4,
        note: 'CrabFreshWaterConfig.CreateCrabFreshWater("CrabFreshWater", ..., "ShellfishMeat", 4) on death; no shell drop',
      },
      { item: 'CrabFreshWaterEgg', perCycle: 1 / 60, note: 'one egg per fertilityCycles (60)' },
    ],
    egg: {
      id: 'CrabFreshWaterEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.crab,
      shellRatio: SHELL_DEFAULT,
    },
    cite: ['CrabFreshWaterConfig.cs', 'BaseCrabConfig.cs', 'CrabTuning.cs'],
  },

  // ===================================================================== Sweetle / Grubgrub (Spaced Out)
  {
    id: 'DivergentBeetle',
    name: 'Sweetle',
    family: 'Divergent',
    dlcIds: ['EXPANSION1_ID'], // DivergentBeetleConfig.GetRequiredDlcIds = DlcManager.EXPANSION1
    spacePerCritter: SPACE.TIER3, // DivergentTuning.PEN_SIZE_PER_CREATURE
    lifespanCycles: 75, // DivergentBeetleConfig.cs Age.maxAttribute 75f (LIFESPAN const)
    caloriesPerCycle: CAL.divergent,
    diet: [
      {
        eats: ['Sulfur'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.divergent / 20, // DivergentBeetleConfig.CALORIES_PER_KG_OF_ORE = 700000 / KG_ORE_EATEN_PER_CYCLE (20)
        kgPerCycle: 20,
        produces: { item: 'Sucrose', ratio: CONV.NORMAL, kgPerCycle: 20 * CONV.NORMAL },
      },
    ],
    products: [
      {
        item: 'Meat',
        amountKg: 1,
        note: 'BaseDivergentConfig.BaseDivergent meatAmount 1 (DivergentBeetleConfig passes 1)',
      },
      {
        item: 'DivergentCropTended effect on plants',
        note: 'Crop tending (8 tends per cycle: BaseDivergent num_tended_per_cycle 8f) applies the "DivergentCropTended" effect: Maturity delta +0.05 multiplier for 600 s (ModifierSet.cs)',
      },
      { item: 'DivergentBeetleEgg', perCycle: 1 / 45, note: 'one egg per fertilityCycles (45)' },
    ],
    egg: {
      id: 'DivergentBeetleEgg',
      fertilityCycles: 45,
      incubationCycles: 15,
      massKg: EGG_MASS.divergent,
      shellRatio: SHELL_DEFAULT,
    }, // DivergentBeetleConfig.cs 45f, 15f
    cite: [
      'DivergentBeetleConfig.cs',
      'BaseDivergentConfig.cs',
      'DivergentTuning.cs',
      'ModifierSet.cs',
    ],
  },
  {
    id: 'DivergentWorm',
    name: 'Grubgrub',
    family: 'Divergent',
    dlcIds: ['EXPANSION1_ID'],
    spacePerCritter: SPACE.TIER4, // DivergentTuning.PEN_SIZE_PER_CREATURE_WORM = TIER4
    lifespanCycles: 150, // DivergentWormConfig.cs Age.maxAttribute 150f (LIFESPAN const)
    caloriesPerCycle: CAL.divergent,
    diet: [
      {
        eats: ['Sulfur'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.divergent / 50, // DivergentWormConfig.CALORIES_PER_KG_OF_ORE = 700000 / KG_ORE_EATEN_PER_CYCLE (50)
        kgPerCycle: 50,
        produces: { item: 'Mud', ratio: CONV.BAD_2, kgPerCycle: 50 * CONV.BAD_2 },
      },
      {
        eats: ['Sucrose'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.divergent / 30, // DivergentWormConfig.CALORIES_PER_KG_OF_SUCROSE = 700000 / KG_SUCROSE_EATEN_PER_CYCLE (30)
        kgPerCycle: 30,
        produces: { item: 'Mud', ratio: 1, kgPerCycle: 30 * 1 },
      },
    ],
    products: [
      {
        item: 'Meat',
        amountKg: 3,
        note: 'DivergentWormConfig passes meatAmount 3 to BaseDivergent',
      },
      {
        item: 'DivergentCropTendedWorm effect on plants',
        note: 'BaseDivergent num_tended_per_cycle 8f; "DivergentCropTendedWorm" effect: Maturity delta +0.5 multiplier for 600 s (ModifierSet.cs; DivergentWormConfig.CROP_TENDED_MULTIPLIER_EFFECT 0.5)',
      },
      { item: 'DivergentWormEgg', perCycle: 1 / 90, note: 'one egg per fertilityCycles (90)' },
    ],
    egg: {
      id: 'DivergentWormEgg',
      fertilityCycles: 90,
      incubationCycles: 30,
      massKg: EGG_MASS.divergent,
      shellRatio: SHELL_DEFAULT,
    }, // DivergentWormConfig.cs 90f, 30f
    cite: [
      'DivergentWormConfig.cs',
      'BaseDivergentConfig.cs',
      'DivergentTuning.cs',
      'ModifierSet.cs',
    ],
  },

  // ===================================================================== Prehistoric (DLC4)
  {
    id: 'Stego',
    name: 'Lumb',
    family: 'Stego',
    dlcIds: ['DLC4_ID'], // StegoConfig.GetRequiredDlcIds = DlcManager.DLC4
    spacePerCritter: SPACE.TIER4, // StegoTuning.PEN_SIZE_PER_CREATURE
    lifespanCycles: 200, // StegoConfig.cs Age.maxAttribute 200f
    caloriesPerCycle: CAL.stego,
    diet: [
      {
        eats: ['VineFruit'],
        foodType: 'EatSolid',
        caloriesPerKg: 325000, // StegoTuning.CALORIES_PER_KG_OF_ORE = STANDARD_CALORIES_PER_CYCLE / VINE_FOOD_PER_CYCLE (= TUNING/FOOD.cs VINEFRUIT 325000)
        kgPerCycle: 4, // StegoTuning.VINE_FOOD_PER_CYCLE
        produces: { item: 'Peat', ratio: 200 / 4, kgPerCycle: 200 }, // PEAT_PRODUCED_PER_CYCLE (200) / VINE_FOOD_PER_CYCLE (4)
      },
      {
        eats: ['PrickleFruit'],
        foodType: 'EatSolid',
        caloriesPerKg: 1600000, // 325000 * (PRICKLEFRUIT 1600000 / VINEFRUIT 325000), BaseStegoConfig.StandardDiets
        kgPerCycle: CAL.stego / 1600000,
        produces: { item: 'Peat', ratio: (200 / 4) * (1600000 / 325000), kgPerCycle: 200 }, // PEAT / (VINE / num)
      },
      {
        eats: ['SwampFruit'],
        foodType: 'EatSolid',
        caloriesPerKg: 1840000, // SWAMPFRUIT 1840000 (TUNING/FOOD.cs)
        kgPerCycle: CAL.stego / 1840000,
        produces: {
          item: 'Peat',
          ratio: (200 / 4) * (1840000 / 325000) * 1.5,
          kgPerCycle: 200 * 1.5,
        }, // num3 = 1.5f
        note: 'Added only when DlcManager.IsExpansion1Active() (BaseStegoConfig.StandardDiets)',
      },
    ],
    products: [
      {
        item: 'DinosaurMeat',
        amountKg: 12,
        note: 'BaseStegoConfig.cs onDeathDropID "DinosaurMeat", count 12f',
      },
      { item: 'StegoEgg', perCycle: 1 / 120, note: 'one egg per fertilityCycles (120)' },
    ],
    egg: {
      id: 'StegoEgg',
      fertilityCycles: 120,
      incubationCycles: 40,
      massKg: EGG_MASS.stego,
      shellRatio: SHELL_DEFAULT,
    }, // StegoConfig.cs 120.00001f, 40f
    cite: ['StegoConfig.cs', 'BaseStegoConfig.cs', 'StegoTuning.cs', 'TUNING/FOOD.cs'],
  },
  {
    id: 'AlgaeStego',
    name: 'Blum Lumb',
    family: 'Stego',
    dlcIds: ['DLC4_ID'],
    spacePerCritter: SPACE.TIER4,
    lifespanCycles: 200, // AlgaeStegoConfig.cs Age.maxAttribute 200f
    caloriesPerCycle: CAL.stego,
    diet: [
      {
        eats: ['VineFruit'],
        foodType: 'EatSolid',
        caloriesPerKg: 325000,
        kgPerCycle: 4,
        produces: { item: 'Algae', ratio: 33, kgPerCycle: 132 }, // AlgaeStegoConfig.Diets: ratio 33f; PRODUCT_PRODUCED_PER_CYCLE 132
      },
      {
        eats: ['PrickleFruit'],
        foodType: 'EatSolid',
        caloriesPerKg: 1600000,
        kgPerCycle: CAL.stego / 1600000,
        produces: { item: 'Algae', ratio: 132 / (4 / (1600000 / 325000)), kgPerCycle: 132 },
      },
      {
        eats: ['SwampFruit'],
        foodType: 'EatSolid',
        caloriesPerKg: 1840000,
        kgPerCycle: CAL.stego / 1840000,
        produces: {
          item: 'Algae',
          ratio: (132 / (4 / (1840000 / 325000))) * 1.5,
          kgPerCycle: 132 * 1.5,
        },
        note: 'Added only when DlcManager.IsExpansion1Active()',
      },
    ],
    products: [
      { item: 'DinosaurMeat', amountKg: 12, note: 'BaseStegoConfig.cs count 12f' },
      { item: 'AlgaeStegoEgg', perCycle: 1 / 120, note: 'one egg per fertilityCycles (120)' },
    ],
    egg: {
      id: 'AlgaeStegoEgg',
      fertilityCycles: 120,
      incubationCycles: 40,
      massKg: EGG_MASS.stego,
      shellRatio: SHELL_DEFAULT,
    },
    cite: ['AlgaeStegoConfig.cs', 'BaseStegoConfig.cs', 'StegoTuning.cs', 'TUNING/FOOD.cs'],
  },
  {
    id: 'Chameleon',
    name: 'Dartle',
    family: 'Chameleon',
    dlcIds: ['DLC4_ID'],
    spacePerCritter: SPACE.TIER1, // ChameleonTuning.PEN_SIZE_PER_CREATURE
    lifespanCycles: 50, // ChameleonConfig.LIFESPAN = 50
    caloriesPerCycle: CAL.chameleon,
    diet: [
      {
        eats: ['DewDrip'],
        foodType: 'EatSolid',
        caloriesPerKg: CAL.chameleon / 1, // ChameleonConfig.CALORIES_PER_DRIP_EATEN = STANDARD / DRIPS_EATEN_PER_CYCLE (1)
        kgPerCycle: 1,
        produces: { item: 'BleachStone', ratio: 10, kgPerCycle: 10 }, // ChameleonConfig.KG_POOP_PER_DRIP = 10
        note: 'Also emits ChlorineGas at 0.005 kg per kcal consumed (EntityTemplates.AddSecondaryExcretion; CaloriesConsumedSecondaryExcretionMonitor uses calories * 0.001 * rate) = 2000 kcal * 0.005 = 10 kg per cycle',
      },
    ],
    products: [
      { item: 'Meat', amountKg: 0.5, note: 'BaseChameleonConfig.cs onDeathDropCount 0.5f' },
      {
        item: 'DewDripperPlant harvest',
        note: 'ShakeHarvestMonitor: cooldownDuration 150 s, radius 10, harvestable plant "DewDripperPlant" (BaseChameleonConfig.cs)',
      },
      {
        item: 'ChameleonEgg',
        perCycle: 1 / 30,
        note: 'one egg per fertilityCycles (0.6 * 50 = 30)',
      },
    ],
    egg: {
      id: 'ChameleonEgg',
      fertilityCycles: 30,
      incubationCycles: 10,
      massKg: EGG_MASS.chameleon,
      shellRatio: SHELL_DEFAULT,
    }, // ChameleonConfig.cs 0.6f * LIFESPAN, 0.2f * LIFESPAN
    cite: ['ChameleonConfig.cs', 'BaseChameleonConfig.cs', 'ChameleonTuning.cs'],
  },
  {
    id: 'Raptor',
    name: 'Rhex',
    family: 'Raptor',
    dlcIds: ['DLC4_ID'],
    spacePerCritter: SPACE.TIER4, // RaptorConfig.cs ExtendEntityToWildCreature(..., SPACE_REQUIREMENTS.TIER4)
    lifespanCycles: 200, // RaptorConfig.cs Age.maxAttribute 200f
    caloriesPerCycle: CAL.raptor,
    diet: [
      {
        eats: ['DinosaurMeat', 'Meat'],
        foodType: 'EatSolid',
        caloriesPerKg: 1600000, // RaptorTuning.CALORIES_PER_UNIT_EATEN = MEAT.CaloriesPerUnit
        kgPerCycle: CAL.raptor / 1600000,
        produces: { item: 'BrineIce', ratio: 128, kgPerCycle: (CAL.raptor / 1600000) * 128 }, // RaptorTuning.BASE_PRODUCTION_RATE
      },
      {
        eats: [
          '<butchered prey: baby and adult critters listed in BaseRaptorConfig.StandardDiets>',
        ],
        foodType: 'EatButcheredPrey',
        caloriesPerKg: 1600000,
        kgPerCycle: CAL.raptor / 1600000,
        produces: { item: 'BrineIce', ratio: 256, kgPerCycle: (CAL.raptor / 1600000) * 256 }, // RaptorTuning.PREY_PRODUCTION_RATE
      },
    ],
    products: [
      { item: 'DinosaurMeat', amountKg: 5, note: 'BaseRaptorConfig.cs onDeathDropCount 5f' },
      {
        item: 'FeatherFabric',
        amountKg: 1 * 4,
        perCycle: 1,
        note: 'Shearing: WellFedShearable dropMass = FIBER_PER_CYCLE (1) * SCALE_GROWTH_TIME_IN_CYCLES (4) = 4 kg, effect "RaptorWellFed", needs RaptorTuning.STANDARD_CALORIES_PER_CYCLE per cycle',
      },
      { item: 'RaptorEgg', perCycle: 1 / 120, note: 'one egg per fertilityCycles (120)' },
    ],
    egg: {
      id: 'RaptorEgg',
      fertilityCycles: 120,
      incubationCycles: 40,
      massKg: EGG_MASS.raptor,
      shellRatio: SHELL_DEFAULT,
    }, // RaptorConfig.cs 120.00001f, 40f
    cite: ['RaptorConfig.cs', 'BaseRaptorConfig.cs', 'RaptorTuning.cs', 'TUNING/FOOD.cs'],
  },

  // ===================================================================== Frosty Planet (DLC2)
  {
    id: 'Seal',
    name: 'Spigot Seal',
    family: 'Seal',
    dlcIds: ['DLC2_ID'],
    spacePerCritter: SPACE.TIER3, // SealTuning.PEN_SIZE_PER_CREATURE
    lifespanCycles: 100, // SealConfig.cs Age.maxAttribute 100f
    caloriesPerCycle: CAL.seal,
    diet: [
      {
        eats: ['SpaceTree'],
        foodType: 'EatPlantStorage',
        caloriesPerKg: 2500, // SealConfig.cs literal; SealConfig.CALORIES_PER_1KG_OF_SUGAR_WATER = 2500
        kgPerCycle: CAL.seal / 2500, // = 40, SealConfig.SUGAR_WATER_KG_CONSUMED_PER_DAY
        produces: { item: 'Ethanol', ratio: CONV.GOOD_3, kgPerCycle: 40 * CONV.GOOD_3 },
        note: 'Drinks the sap stored in SpaceTree (Sugar Water)',
      },
      {
        eats: ['Sucrose'],
        foodType: 'EatSolid',
        caloriesPerKg: 3246.7532, // SealConfig.cs literal
        kgPerCycle: CAL.seal / 3246.7532,
        produces: {
          item: 'Ethanol',
          ratio: 1.2987013,
          kgPerCycle: (CAL.seal / 3246.7532) * 1.2987013,
        },
      },
    ],
    products: [
      {
        item: 'SpaceTreeSeed',
        note: 'CreaturePoopLoot: 0.2 chance per poop (SealConfig.SUGAR_TREE_SEED_PROBABILITY_ON_POOP)',
      },
      { item: 'SealEgg', perCycle: 1 / 60, note: 'one egg per fertilityCycles (60)' },
    ],
    egg: {
      id: 'SealEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.seal,
      shellRatio: SHELL_DEFAULT,
    }, // SealConfig.cs 60.000004f, 20f
    cite: ['SealConfig.cs', 'BaseSealConfig.cs', 'SealTuning.cs'],
  },
  {
    id: 'WoodDeer',
    name: 'Flox',
    family: 'Deer',
    dlcIds: ['DLC2_ID'],
    spacePerCritter: SPACE.TIER3, // DeerTuning.PEN_SIZE_PER_CREATURE
    lifespanCycles: 100, // WoodDeerConfig.cs Age.maxAttribute 100f
    caloriesPerCycle: CAL.deer,
    diet: [
      {
        eats: ['HardSkinBerryPlant', 'HardSkinBerry', 'PrickleFlower', 'PrickleFruit'],
        foodType: 'EatPlantDirectly',
        produces: { item: 'Dirt', ratio: 8.333334 },
        note: 'caloriesPerKg omitted: WoodDeerConfig.HARD_SKIN_CALORIES_PER_KG depends on CROPS.CROP_TYPES HardSkinBerry cropDuration (TUNING/CROPS.cs not resolved here). Poop ratio = POOP_MASS_CONVERSION_MULTIPLIER 8.333334 (x3 for HardSkinBerry fruit, x6 for PrickleFruit)',
      },
    ],
    products: [
      { item: 'Meat', amountKg: 1, note: 'BaseDeerConfig.cs onDeathDropCount 1f' },
      {
        item: 'WoodLog',
        amountKg: 60 * 6,
        perCycle: 60,
        note: 'Shearing antlers: WellFedShearable dropMass WOOD_MASS_PER_ANTLER = WOOD_PER_CYCLE (60) * ANTLER_GROWTH_TIME_IN_CYCLES (6) = 360 kg; effect "WoodDeerWellFed", needs 100000 cal/cycle',
      },
      { item: 'WoodDeerEgg', perCycle: 1 / 60, note: 'one egg per fertilityCycles (60)' },
    ],
    egg: {
      id: 'WoodDeerEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.deer,
      shellRatio: SHELL_DEFAULT,
    }, // WoodDeerConfig.cs 60.000004f, 20f
    cite: ['WoodDeerConfig.cs', 'BaseDeerConfig.cs', 'DeerTuning.cs'],
  },
  {
    id: 'GlassDeer',
    name: 'Shatter Flox',
    family: 'Deer',
    dlcIds: ['DLC2_ID'],
    spacePerCritter: SPACE.TIER3,
    lifespanCycles: 100, // GlassDeerConfig.cs Age.maxAttribute 100f
    caloriesPerCycle: CAL.deer,
    diet: [
      {
        eats: ['Katairite'],
        foodType: 'EatSolid',
        caloriesPerKg: 5000, // GlassDeerConfig.cs literal; CALORIES_PER_SOLID_KG = 5000
        kgPerCycle: CAL.deer / 5000, // = KG_SOLIDS_EATEN_A_DAY 20
        produces: { item: 'Dirt', ratio: 0.5, kgPerCycle: (CAL.deer / 5000) * 0.5 },
        note: 'Katairite is also GlassDeer requiredDiet for antler (Glass) growth',
      },
      {
        eats: ['HardSkinBerry', 'PrickleFruit', 'HardSkinBerryPlant', 'PrickleFlower'],
        foodType: 'EatPlantDirectly',
        produces: { item: 'Dirt', ratio: 8.333334 },
        note: 'caloriesPerKg omitted: depends on CROPS.CROP_TYPES HardSkinBerry cropDuration. Fruit ratios 25.000002 (HardSkinBerry) and 50.000004 (PrickleFruit); plants use the literal 8.333334 (equals POOP_MASS_PLANT_CONVERSION_MULTIPLIER)',
      },
    ],
    products: [
      { item: 'Meat', amountKg: 1, note: 'BaseDeerConfig.cs onDeathDropCount 1f' },
      {
        item: 'Glass',
        amountKg: 60,
        perCycle: 10,
        note: 'Shearing antlers: WellFedShearable dropMass 60f over growthDurationCycles 6f (ANTLER_MATERIAL_MASS_PER_CYCLE 10), effect "GlassDeerWellFed", requiredDiet Katairite',
      },
      { item: 'GlassDeerEgg', perCycle: 1 / 60, note: 'one egg per fertilityCycles (60)' },
    ],
    egg: {
      id: 'GlassDeerEgg',
      fertilityCycles: 60,
      incubationCycles: 20,
      massKg: EGG_MASS.deer,
      shellRatio: SHELL_DEFAULT,
    },
    cite: ['GlassDeerConfig.cs', 'BaseDeerConfig.cs', 'DeerTuning.cs'],
  },
]

// ---------------------------------------------------------------------------
// Shared ranching constants
// ---------------------------------------------------------------------------

export const ranchConstants = {
  /** (a) Stable / Critter Pen. Database/RoomTypes.cs `CreaturePen`, STRINGS/ROOMS.cs CREATUREPEN.NAME = "Stable" */
  stable: {
    roomTypeId: 'CreaturePen', // RoomTypes.cs: new RoomType("CreaturePen", ...)
    displayName: 'Stable', // STRINGS/ROOMS.cs CREATUREPEN.NAME
    minCells: 12, // RoomTypes.cs RoomConstraints.MINIMUM_SIZE_12 (RoomConstraints.cs: room.cavity.NumCells >= 12)
    maxCells: 96, // RoomTypes.cs RoomConstraints.MAXIMUM_SIZE_96 (RoomConstraints.cs: room.cavity.NumCells <= 96)
    /** primary constraint: at least one building tagged RoomConstraints.ConstraintTags.RanchStationType */
    requiredBuilding:
      'Any building with the RanchStationType tag (RoomTypes.cs primary constraint RoomConstraints.RANCH_STATION). Buildings that add the tag: RanchStation (Grooming Station), UnderwaterRanchStation, ShearingStation, UnderwaterShearingStation, MilkingStation, UnderwaterMilkingStation, MilkFeeder, CritterCondo, UnderwaterCritterCondo, AirBorneCritterCondo (grep of RanchStationType in *Config.cs)',
    /** no FeedingTrough / CreatureFeeder constraint exists in the room type */
    otherConstraints: ['No additional constraints beyond MINIMUM_SIZE_12 and MAXIMUM_SIZE_96'],
    roomTypeFlags:
      'RoomType priority 2, single_assignee true, priority_building_use true, effects null, sortKey 14 (RoomTypes.cs); category Agricultural',
    /** RanchStation is built only inside a Stable: RoomTracker.requiredRoomType = CreaturePen, Requirement.Required (RanchStationConfig.cs, ShearingStationConfig.cs, MilkFeederConfig.cs, ...) */
    ranchBuildingsRequireStable: true,
    cite: [
      'Database/RoomTypes.cs',
      'RoomConstraints.cs',
      'STRINGS/ROOMS.cs',
      'RanchStationConfig.cs',
    ],
  },

  /** (b) Overcrowding. OvercrowdingMonitor.cs */
  overcrowding: {
    /** each creature in the same cavity (room/open region) adds its Def.spaceRequiredPerCreature to OccupiedCellCount */
    creatureRule:
      'Occupancy.Analyze: OccupiedCellCount = sum of spaceRequiredPerCreature over creatures in smi.cavity.creatures (fish excluded for land regions; babies count as creatures with their own prefab space)',
    /** eggs add nothing to current occupancy; they only count toward the "future" check, using the hatched creature space */
    eggRule:
      'Eggs are in cavity.eggs; HatchedEggOccupiedCellCount = sum of spawned creature spaceRequiredPerCreature (FetchEggPersonalSpace). Egg Def.spaceRequiredPerCreature is 0 (EggConfig.cs)',
    regionSize:
      'CellCount = cavity.NumCells (room cell count) for land critters; pond cellCount for fish (FishOvercrowingManager)',
    overcrowded: 'IsOvercrowded = CellCount - OccupiedCellCount < 0 (and personal space != 0)',
    futureOvercrowded:
      'IsFutureOvercrowded = CellCount - OccupiedCellCount - HatchedEggOccupiedCellCount < 0 and HatchedEggOccupiedCellCount > 0',
    confined:
      'IsConfined = CellCount < spaceRequiredPerCreature, unless the critter has tag Burrowed or Digger (CONFINEMENT_IMMUNITY_TAGS)',
    effects: {
      overcrowded: {
        effectId: 'Overcrowded',
        // OvercrowdEffect modifier initialised at 0f then SetValue(OvercrowdedModifier) = -ceil(OverOccupiedCells / personalSpace)
        happiness:
          'CritterAttributes.Happiness modifier = -ceil((OccupiedCellCount - CellCount) / spaceRequiredPerCreature), i.e. minus the number of critters over capacity (ComputeOverOccupiedCritterCount uses DivRem + 1 on remainder)',
      },
      futureOvercrowded: {
        effectId: 'FutureOvercrowded',
        fertility:
          'Amounts.Fertility.deltaAttribute modifier -1 as a multiplier (is_multiplier true) => fertility gain x(1 - 1) = 0; also clears tag Creatures.Expecting so FertilityMonitor.IsFertile is false',
      },
      confined: {
        effectId: 'Confined',
        happiness: -10, // OvercrowdingMonitor.cs confined AttributeModifier Happiness -10f
        fertility:
          'Fertility delta -1 multiplier (=> 0); Confined tag also makes FertilityMonitor.IsFertile false',
      },
    },
    /** OvercrowdingMonitor.OVERCROWDED_FERTILITY_DEBUFF const */
    fertilityDebuff: -1,
    cite: [
      'OvercrowdingMonitor.cs',
      'EntityTemplates.cs (ExtendEntityToWildCreature sets Def.spaceRequiredPerCreature)',
      'FertilityMonitor.cs (IsFertile)',
    ],
  },

  /** (c) Rancher */
  rancher: {
    /** RanchStationConfig.cs def.WorkTime */
    workTimeSecondsPerCritter: 12,
    stationSkillPerk: 'CanUseRanchStation (Ranching1: Rancher)', // RanchStationConfig.cs RequiredSkillPerkID; Database/Skills.cs
    /** Cannot ranch swimmers or critters that already have the "Ranched" effect (RanchStationConfig.IsCritterEligibleToBeRanchedCb) */
    eligibility: 'Not tag Creatures.Swimmer and not already Effects.HasEffect("Ranched")',
    /** ModifierSet.cs CreateCritteEffects: new Effect("Ranched", ..., 600f, ...) */
    ranchedEffect: {
      id: 'Ranched',
      baseDurationSeconds: 600, // 1 cycle
      happiness: 5, // CritterAttributes.Happiness +5f
      wildnessDeltaPerSecond: -0.09166667, // Amounts.Wildness.deltaAttribute; x600 = -55 per cycle
    },
    /** RanchStationConfig OnRanchCompleteCb: timeRemaining *= 1 + Ranching * 0.1 */
    durationMultiplierPerRanchingPoint: 0.1,
    durationFormula: 'effect duration = 600 s * (1 + Ranching attribute total * 0.1)',
    onComplete: 'Also restores HP: HitPoints.ApplyDelta(max - value + 1)',
    skills: {
      Ranching1: {
        name: 'Rancher',
        perks: ['IncreaseRanchingSmall (+2 Ranching)', 'CanUseRanchStation', 'CanWrangleCreatures'],
      }, // Database/Skills.cs; ROLES.ATTRIBUTE_BONUS_FIRST = 2
      Ranching2: {
        name: 'Senior Rancher',
        perks: ['IncreaseRanchingMedium (+2 Ranching)', 'CanUseMilkingStation'],
      }, // ROLES.ATTRIBUTE_BONUS_SECOND = 2
    },
    cite: [
      'RanchStationConfig.cs',
      'ModifierSet.cs',
      'Database/Skills.cs',
      'Database/SkillPerks.cs',
      'TUNING/ROLES.cs',
    ],
  },

  /** (d) Drops on death. Butcherable.CreateDrops: dropped mass = prefab base mass * count */
  deathDrops: {
    rule: 'EntityTemplates.DeathDropFunction -> Butcherable.SetDrops({id: count}); Butcherable.CreateDrops(1f) sets Mass = prefab Mass * 1 * count. Meat, FishMeat, ShellfishMeat, DinosaurMeat, CrabShell, CrabWoodShell, PlantMeat, RawEgg, EggShell prefabs are created with mass 1f (CreateLooseEntity ..., 1f), so count = kg',
    mealUnits: 'Meat is the "Meat" food prefab (TUNING/FOOD.cs MEAT: 1600000 cal per unit)',
    eggShell: {
      ratioDefault: 0.5, // EntityTemplates.ExtendEntityToFertileCreature default eggShellRatio
      onHatch:
        'IncubationMonitor.SpawnBaby calls SpawnShell: EggShell with Mass = egg mass * eggShellRatio (none if ratio <= 0 or preventEggDrops)',
      onNonViable: 'SpawnGenericEgg: EggShell (mass * ratio) plus RawEgg (mass * (1 - ratio))',
      zeroRatio: ['Pacu family (PacuTuning.EGG_SHELL_RATIO = 0f)'],
    },
    cite: [
      'EntityTemplates.cs',
      'Butcherable.cs',
      'MeatConfig.cs',
      'IncubationMonitor.cs',
      'EggConfig.cs',
    ],
  },

  /** (e) Lifecycle fractions */
  lifecycle: {
    fertilityTimeByLifespan: 0.6, // TUNING/CREATURES.cs FERTILITY_TIME_BY_LIFESPAN
    incubationTimeByLifespan: 0.2, // TUNING/CREATURES.cs INCUBATION_TIME_BY_LIFESPAN
    incubatorIncubationMultiplier: 4, // TUNING/CREATURES.cs INCUBATOR_INCUBATION_MULTIPLIER (declared; no reference found elsewhere in the decompile, the actual boost is the "EggSong" effect below)
    hugIncubationMultiplier: 1, // TUNING/CREATURES.cs HUG_INCUBATION_MULTIPLIER
    wildCalorieBurnRatio: 0.25, // TUNING/CREATURES.cs WILD_CALORIE_BURN_RATIO (declared; use not traced)
    viabilityLossRate: -0.016666668, // TUNING/CREATURES.cs VIABILITY_LOSS_RATE per second (also IncubationMonitor suppressed effect)
    /** FertilityMonitor.Instance: Fertile effect adds 100 / (baseFertileCycles * 600) per second to Amounts.Fertility (0..100); egg laid at 100 */
    fertilityRatePerSecondFormula: '100 / (baseFertileCycles * 600)',
    /** EntityTemplates.ExtendEntityToFertileCreature: baseIncubationRate = 100 / (600 * incubationCycles) */
    incubationRatePerSecondFormula: '100 / (600 * incubationCycles)',
    /** EggSong (Incubator song) and EggHug effects on Amounts.Incubation.deltaAttribute (multipliers, ModifierSet.cs) */
    incubationEffects: { EggSong: 4, EggHug: 1 },
    cite: [
      'TUNING/CREATURES.cs',
      'EntityTemplates.cs',
      'FertilityMonitor.cs',
      'ModifierSet.cs',
      'IncubationMonitor.cs',
    ],
  },

  /** (f) Happiness / wildness effects on egg laying. Only exact statements. */
  happiness: {
    /** HappinessMonitor.Def defaults */
    thresholds: { happy: 1, glum: -1, miserable: -10 },
    states:
      'Happy: total >= 1; Neutral: -1 < total < 1; Glum: -10 < total <= -1; Miserable: total <= -10 (HappinessMonitor.IsHappy/IsNeutral/IsGlum/IsMisirable)',
    /** Miserable tame/wild effects: Fertility delta multiplier -1 (=> no egg progress) and ScaleGrowth delta multiplier -1 (HappinessMonitor.cs) */
    miserable:
      'Fertility delta x(1 - 1) = 0 and ScaleGrowth delta x(1 - 1) = 0 while Miserable; Metabolism -80 (tame) / -15 (wild)',
    glum: 'Metabolism -80 (tame) / -15 (wild); no fertility change',
    /** Happiness attribute contributions found in the decompile (all additive on CritterAttributes.Happiness, base 0) */
    contributions: {
      tameBase: -1, // EntityTemplates.cs ExtendEntityToWildCreature tameEffect
      ranched: 5, // ModifierSet.cs "Ranched"
      hadMilk: 5, // ModifierSet.cs "HadMilk"
      hadInk: 3, // "HadInk"
      ateWellPreparedFishFood: 2, // "AteWellPreparedFishFood"
      ateWellPreparedJawboFood: 2, // "AteWellPreparedJawboFood"
      baby: 5, // BabyMonitor.cs babyEffect
      critterCondoInteract: 1, // CritterCondoConfig.cs / UnderwaterCritterCondoConfig.cs
      confined: -10, // OvercrowdingMonitor.cs
      overcrowded: 'minus the number of critters over capacity', // OvercrowdingMonitor.cs
      temperatureUncomfortable: -1, // CritterTemperatureMonitor.cs
      temperatureDeadly: -2, // CritterTemperatureMonitor.cs
      outOfCaloriesTame: -10, // CreatureCalorieMonitor.cs
      drowning: -100, // DrowningMonitor.cs
      mosquitoBite: -1, // ModifierSet.cs CritterMosquitoBite
    },
    /** Fertility only advances while tag Expecting is set and neither PausedReproduction nor Confined is set (FertilityMonitor.IsFertile) */
    fertileConditions:
      'Not PausedReproduction, not Confined, and tag Creatures.Expecting (set when not baby and not FutureOvercrowded)',
    wild: {
      // EntityTemplates.cs ExtendEntityToWildCreature wildEffect
      wildnessDeltaPerSecond: 0.008333334,
      metabolism: -75,
      scaleGrowthMultiplier: -0.75,
      /** WildnessMonitor.IsWild: wildness.value > 0; tame at 0 */
      note: 'Creature is wild while Wildness > 0. Eggs copy the parent Wildness (FertilityMonitor.Instance.LayEgg / IncubationMonitor.SpawnBaby: Amounts.Wildness.Copy)',
    },
    cite: [
      'HappinessMonitor.cs',
      'ModifierSet.cs',
      'EntityTemplates.cs',
      'WildnessMonitor.cs',
      'FertilityMonitor.cs',
      'Klei/AI/AttributeInstance.cs',
    ],
  },

  /**
   * Egg-morph mechanics. FertilityMonitor.BreedingChance weights start from the species EGG_CHANCES_* lists, are
   * nudged by FertilityModifiers (TUNING/CREATURES.cs EGG_CHANCE_MODIFIERS.MODIFIER_CREATORS), clamped per call
   * to [-weight, 1 - weight], then renormalised to sum 1 (FertilityMonitor.Instance.AddBreedingChance / NormalizeBreedingChances).
   */
  morphModifiers: [
    // Dietary: weight += calories eaten * perCal when the eaten tag matches (CreateDietaryModifier)
    {
      id: 'HatchHard',
      egg: 'HatchHardEgg',
      kind: 'diet',
      trigger: 'SedimentaryRock eaten',
      perCalorie: 0.05 / 700000,
    }, // 0.05f / HatchTuning.STANDARD_CALORIES_PER_CYCLE
    {
      id: 'HatchVeggie',
      egg: 'HatchVeggieEgg',
      kind: 'diet',
      trigger: 'Dirt eaten',
      perCalorie: 0.05 / 700000,
    },
    {
      id: 'HatchMetal',
      egg: 'HatchMetalEgg',
      kind: 'diet',
      trigger: 'HatchMetalConfig.METAL_ORE_TAGS eaten',
      perCalorie: 0.05 / 700000,
    },
    {
      id: 'LightBugOrange',
      egg: 'LightBugOrangeEgg',
      kind: 'diet',
      trigger: 'GrilledPrickleFruit eaten',
      perCalorie: 0.00125,
    },
    {
      id: 'LightBugPurple',
      egg: 'LightBugPurpleEgg',
      kind: 'diet',
      trigger: 'FriedMushroom eaten',
      perCalorie: 0.00125,
    },
    {
      id: 'LightBugPink',
      egg: 'LightBugPinkEgg',
      kind: 'diet',
      trigger: 'SpiceBread eaten',
      perCalorie: 0.00125,
    },
    {
      id: 'LightBugBlue',
      egg: 'LightBugBlueEgg',
      kind: 'diet',
      trigger: 'Salsa eaten',
      perCalorie: 0.00125,
    },
    {
      id: 'LightBugBlack',
      egg: 'LightBugBlackEgg',
      kind: 'diet',
      trigger: 'Phosphorus eaten',
      perCalorie: 0.00125,
    },
    {
      id: 'LightBugCrystal',
      egg: 'LightBugCrystalEgg',
      kind: 'diet',
      trigger: 'CookedMeat eaten',
      perCalorie: 0.00125,
    },
    {
      id: 'DreckoPlastic',
      egg: 'DreckoPlasticEgg',
      kind: 'diet',
      trigger: 'BasicSingleHarvestPlant eaten',
      perCalorie: 0.025 / 2000000,
    }, // 0.025f / DreckoTuning.STANDARD_CALORIES_PER_CYCLE
    {
      id: 'SquirrelHug',
      egg: 'SquirrelHugEgg',
      kind: 'diet',
      trigger: 'BasicFabricMaterialPlant eaten',
      perCalorie: 0.025 / 100000,
    }, // 0.025f / SquirrelTuning.STANDARD_CALORIES_PER_CYCLE
    // Temperature (critter temperature strictly inside (min, max)): weight += dt * perSecond; alsoInvert false => no decay outside
    {
      id: 'OilFloaterHighTemp',
      egg: 'OilfloaterHighTempEgg',
      kind: 'temperature',
      minK: 373.15,
      maxK: 523.15,
      perSecond: 8.333333e-5,
    },
    {
      id: 'OilFloaterDecor',
      egg: 'OilfloaterDecorEgg',
      kind: 'temperature',
      minK: 293.15,
      maxK: 333.15,
      perSecond: 8.333333e-5,
    },
    {
      id: 'PacuTropical',
      egg: 'PacuTropicalEgg',
      kind: 'temperature',
      minK: 308.15,
      maxK: 353.15,
      perSecond: 8.333333e-5,
    },
    {
      id: 'PacuCleaner',
      egg: 'PacuCleanerEgg',
      kind: 'temperature',
      minK: 243.15,
      maxK: 278.15,
      perSecond: 8.333333e-5,
    },
    {
      id: 'MoleDelicacy',
      egg: 'MoleDelicacyEgg',
      kind: 'temperature',
      minK: 333.15,
      maxK: 373.15,
      perSecond: 8.333333e-5,
    }, // MoleDelicacyConfig.EGG_CHANCES_TEMPERATURE_MIN/MAX
    // Nearby creature (CreateNearbyCreatureModifier): weight += dt * perSecond while a PuftAlpha / PuftAlphaBaby is nearby; alsoInvert true subtracts otherwise
    {
      id: 'PuftAlphaBalance',
      egg: 'PuftAlphaEgg',
      kind: 'nearbyCreature',
      nearby: 'PuftAlpha or PuftAlphaBaby',
      perSecond: -0.00025,
      alsoInvert: true,
    },
    {
      id: 'PuftAlphaNearbyOxylite',
      egg: 'PuftOxyliteEgg',
      kind: 'nearbyCreature',
      nearby: 'PuftAlpha or PuftAlphaBaby',
      perSecond: 8.333333e-5,
      alsoInvert: false,
    },
    {
      id: 'PuftAlphaNearbyBleachstone',
      egg: 'PuftBleachstoneEgg',
      kind: 'nearbyCreature',
      nearby: 'PuftAlpha or PuftAlphaBaby',
      perSecond: 8.333333e-5,
      alsoInvert: false,
    },
    // Crop tended (DivergentWorm): weight += perEvent for each tend of WormPlant / SuperWormPlant
    {
      id: 'DivergentWorm',
      egg: 'DivergentWormEgg',
      kind: 'cropTended',
      crops: ['WormPlant', 'SuperWormPlant'],
      perEvent: 0.05 / 2,
    }, // 0.05f / DivergentTuning.TIMES_TENDED_PER_CYCLE_FOR_EVOLUTION (2)
    // Element at the critter cell (CreateElementCreatureModifier): weight += dt * perSecond while in that element (substantial liquid >= 0.35 kg when checkSubstantialLiquid)
    {
      id: 'PokeLumber',
      egg: 'CrabWoodEgg',
      kind: 'element',
      element: 'Ethanol',
      perSecond: 0.00025,
      alsoInvert: true,
    },
    {
      id: 'PokeFreshWater',
      egg: 'CrabFreshWaterEgg',
      kind: 'element',
      element: 'Water',
      perSecond: 0.00025,
      alsoInvert: true,
    },
    {
      id: 'AlgaeStego',
      egg: 'AlgaeStegoEgg',
      kind: 'element',
      element: 'CarbonDioxide',
      perSecond: 0.00025,
      alsoInvert: true,
    },
    // Decor (CreateDecorModifier) - Frosty Planet
    {
      id: 'GlassDeerDecor',
      egg: 'GlassDeerEgg',
      kind: 'decor',
      minDecor: 100,
      perSecond: 8.333333e-5,
      alsoInvert: true,
    },
  ],
  /** Where the base egg weights live, for completeness: per-species EGG_CHANCES_* in TUNING/*Tuning.cs (e.g. HatchTuning.EGG_CHANCES_BASE = Hatch 0.98, HatchHard 0.02, HatchVeggie 0.02, renormalised) */
  breedingNote:
    'Initial weights are not normalised in the lists (HatchTuning.EGG_CHANCES_BASE sums to 1.02); InitializeBreedingChances/NormalizeBreedingChances renormalise.',
} as const
