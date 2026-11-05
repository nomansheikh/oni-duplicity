/**
 * Space points of interest in Spaced Out: what the game rolls their capacity and recharge in.
 *
 * Transcribed from the `HarvestablePOIType` and `ArtifactPOIType` constructor calls in
 * `HarvestablePOIConfig` and `ArtifactPOIConfig` (Assembly-CSharp), with names from
 * `STRINGS.UI.SPACEDESTINATIONS`. `tests/space-pois.test.ts` checks the ranges against every
 * POI in the test saves: a saved roll that lands outside its type's range means a wrong range.
 */

export interface PoiRange {
  min: number
  max: number
}

export interface HarvestablePoiType {
  /** The type ID; the POI's `configuration.typeId` holds its HashedString hash. */
  id: string
  name: string
  /** Kilograms the POI holds when full. */
  capacity: PoiRange
  /** Seconds the POI takes to refill from empty. */
  recharge: PoiRange
  /** Whether the POI can also yield artifacts. */
  artifacts: boolean
  /** `SimHashes` names and the weight of each in what is harvested. */
  elements: [string, number][]
}

export interface ArtifactPoiType {
  id: string
  name: string
  /** Seconds the POI takes to produce its next artifact. */
  recharge: PoiRange
  /** A fixed artifact, if the POI always yields the same one. */
  artifact?: string
  /** Whether the POI is used up once its artifact is taken. */
  destroyOnHarvest: boolean
}

const range = (min: number, max: number): PoiRange => ({ min, max })

export const harvestablePoiTypes: HarvestablePoiType[] = [
  {
    id: 'CarbonAsteroidField',
    name: 'Carbon Asteroid Field',
    capacity: range(30000, 45000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['RefinedCarbon', 1.5],
      ['Carbon', 5.5],
    ],
  },
  {
    id: 'MetallicAsteroidField',
    name: 'Metallic Asteroid Field',
    capacity: range(54000, 81000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['MoltenIron', 1.25],
      ['Cuprite', 1.75],
      ['Obsidian', 6.25],
      ['MoltenLead', 1.75],
    ],
  },
  {
    id: 'SatelliteField',
    name: 'Space Debris',
    capacity: range(30000, 45000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['Sand', 3],
      ['IronOre', 3],
      ['MoltenCopper', 2.67],
      ['Glass', 1.33],
    ],
  },
  {
    id: 'RockyAsteroidField',
    name: 'Rocky Asteroid Field',
    capacity: range(81000, 94000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['Katairite', 2],
      ['Granite', 2],
      ['SedimentaryRock', 3],
      ['IgneousRock', 3],
    ],
  },
  {
    id: 'InterstellarIceField',
    name: 'Ice Asteroid Field',
    capacity: range(54000, 81000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['Ice', 2.5],
      ['SolidCarbonDioxide', 7],
      ['SolidOxygen', 0.5],
    ],
  },
  {
    id: 'OrganicMassField',
    name: 'Organic Mass Field',
    capacity: range(54000, 81000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['SlimeMold', 3],
      ['Algae', 3],
      ['ContaminatedOxygen', 1],
      ['Dirt', 3],
    ],
  },
  {
    id: 'IceAsteroidField',
    name: 'Exploded Ice Giant',
    capacity: range(54000, 81000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['Ice', 6],
      ['SolidCarbonDioxide', 2],
      ['Oxygen', 1.5],
      ['SolidMethane', 0.5],
    ],
  },
  {
    id: 'GasGiantCloud',
    name: 'Exploded Gas Giant',
    capacity: range(15000, 20000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['Methane', 1],
      ['LiquidMethane', 1],
      ['SolidMethane', 1],
      ['Hydrogen', 7],
    ],
  },
  {
    id: 'ChlorineCloud',
    name: 'Chlorine Cloud',
    capacity: range(54000, 81000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['Chlorine', 2.5],
      ['BleachStone', 7.5],
    ],
  },
  {
    id: 'GildedAsteroidField',
    name: 'Gilded Asteroid Field',
    capacity: range(30000, 45000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['Gold', 2.5],
      ['Fullerene', 1],
      ['RefinedCarbon', 1],
      ['SedimentaryRock', 4.5],
      ['Regolith', 1],
    ],
  },
  {
    id: 'GlimmeringAsteroidField',
    name: 'Glimmering Asteroid Field',
    capacity: range(30000, 45000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['MoltenTungsten', 2],
      ['Wolframite', 6],
      ['Carbon', 1],
      ['CarbonDioxide', 1],
    ],
  },
  {
    id: 'HeliumCloud',
    name: 'Helium Cloud',
    capacity: range(30000, 45000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['Hydrogen', 2],
      ['Water', 8],
    ],
  },
  {
    id: 'OilyAsteroidField',
    name: 'Oily Asteroid Field',
    capacity: range(15000, 25000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['SolidCarbonDioxide', 7.75],
      ['SolidMethane', 1.125],
      ['CrudeOil', 1.125],
    ],
  },
  {
    id: 'OxidizedAsteroidField',
    name: 'Oxidized Asteroid Field',
    capacity: range(54000, 81000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['Rust', 8],
      ['SolidCarbonDioxide', 2],
    ],
  },
  {
    id: 'SaltyAsteroidField',
    name: 'Salty Asteroid Field',
    capacity: range(54000, 81000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['SaltWater', 5],
      ['Brine', 4],
      ['SolidCarbonDioxide', 1],
    ],
  },
  {
    id: 'FrozenOreField',
    name: 'Frozen Ore Asteroid Field',
    capacity: range(54000, 81000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['Ice', 2.33],
      ['DirtyIce', 2.33],
      ['Snow', 1.83],
      ['AluminumOre', 2],
    ],
  },
  {
    id: 'ForestyOreField',
    name: 'Forested Ore Field',
    capacity: range(54000, 81000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['IgneousRock', 7],
      ['AluminumOre', 1],
      ['CarbonDioxide', 2],
    ],
  },
  {
    id: 'SwampyOreField',
    name: 'Swampy Ore Field',
    capacity: range(54000, 81000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['Mud', 2],
      ['ToxicSand', 7],
      ['Cobaltite', 1],
    ],
  },
  {
    id: 'SandyOreField',
    name: 'Sandy Ore Field',
    capacity: range(54000, 81000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['SandStone', 4],
      ['Algae', 2],
      ['Cuprite', 1],
      ['Sand', 3],
    ],
  },
  {
    id: 'RadioactiveGasCloud',
    name: 'Radioactive Gas Cloud',
    capacity: range(5000, 10000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['UraniumOre', 2],
      ['Chlorine', 2],
      ['CarbonDioxide', 7],
    ],
  },
  {
    id: 'RadioactiveAsteroidField',
    name: 'Radioactive Asteroid Field',
    capacity: range(5000, 10000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['UraniumOre', 2],
      ['Sulfur', 3],
      ['BleachStone', 2],
      ['Rust', 4],
    ],
  },
  {
    id: 'OxygenRichAsteroidField',
    name: 'Oxygen Rich Asteroid Field',
    capacity: range(15000, 25000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['Water', 4],
      ['ContaminatedOxygen', 2],
      ['Ice', 4],
    ],
  },
  {
    id: 'InterstellarOcean',
    name: 'Interstellar Ocean',
    capacity: range(15000, 25000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['SaltWater', 2.5],
      ['Brine', 2.5],
      ['Salt', 2.5],
      ['Ice', 2.5],
    ],
  },
  {
    id: 'DLC2CeresField',
    name: 'Frozen Cinnabar Asteroid Field',
    capacity: range(15000, 25000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['Cinnabar', 4.5],
      ['Mercury', 2.5],
      ['Ice', 2.5],
    ],
  },
  {
    id: 'DLC2CeresOreField',
    name: 'Frozen Mercury Asteroid Field',
    capacity: range(15000, 25000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['Cinnabar', 2.5],
      ['Mercury', 2.5],
      ['Ice', 3.5],
    ],
  },
  {
    id: 'DLC4PrehistoricMixingField',
    name: 'Conductive Ore Field',
    capacity: range(15000, 25000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['NickelOre', 4.5],
      ['Peat', 2.5],
      ['Shale', 1],
      ['Amber', 1],
      ['Iridium', 0.5],
    ],
  },
  {
    id: 'DLC4PrehistoricOreField',
    name: 'Amber Field',
    capacity: range(15000, 25000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['NickelOre', 1.5],
      ['Peat', 2.5],
      ['Shale', 1],
      ['Amber', 1],
    ],
  },
  {
    id: 'DLC4ImpactorDebrisField1',
    name: 'Demolior Debris',
    capacity: range(35000, 45000),
    recharge: range(30000, 30000),
    artifacts: false,
    elements: [
      ['Iridium', 1.7],
      ['MaficRock', 2.3],
      ['Gold', 2.1],
      ['Granite', 3.9],
    ],
  },
  {
    id: 'DLC4ImpactorDebrisField2',
    name: 'Liquid Demolior Debris',
    capacity: range(33400, 66800),
    recharge: range(30000, 30000),
    artifacts: false,
    elements: [
      ['Isoresin', 1.8],
      ['Petroleum', 3.5],
      ['LiquidSulfur', 4.7],
    ],
  },
  {
    id: 'DLC4ImpactorDebrisField3',
    name: 'Molten Demolior Debris',
    capacity: range(110000, 137500),
    recharge: range(30000, 30000),
    artifacts: false,
    elements: [
      ['MoltenIridium', 3.7],
      ['LiquidOxygen', 0.6],
      ['LiquidHydrogen', 0.6],
      ['Magma', 5.1],
    ],
  },
  {
    id: 'DLC5AquaticMixingField',
    name: 'Zinc Ore Field',
    capacity: range(15000, 25000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['ZincOre', 4.5],
      ['SiltStone', 2.5],
      ['Corallium', 2.5],
      ['Basalt', 1.5],
      ['Coquina', 1.5],
    ],
  },
  {
    id: 'DLC5AquaticOreField',
    name: 'Zinc Ore Field',
    capacity: range(15000, 25000),
    recharge: range(30000, 60000),
    artifacts: true,
    elements: [
      ['ZincOre', 4.5],
      ['SiltStone', 2.5],
      ['Corallium', 2.5],
      ['Basalt', 1.5],
      ['Coquina', 1.5],
    ],
  },
]

export const artifactPoiTypes: ArtifactPoiType[] = [
  {
    id: 'GravitasSpaceStation1',
    name: 'Destroyed Satellite',
    recharge: range(30000, 60000),
    destroyOnHarvest: false,
  },
  {
    id: 'GravitasSpaceStation2',
    name: 'Demolished Rocket',
    recharge: range(30000, 60000),
    destroyOnHarvest: false,
  },
  {
    id: 'GravitasSpaceStation3',
    name: 'Ruined Rocket',
    recharge: range(30000, 60000),
    destroyOnHarvest: false,
  },
  {
    id: 'GravitasSpaceStation4',
    name: 'Retired Planetary Excursion Module',
    recharge: range(30000, 60000),
    destroyOnHarvest: false,
  },
  {
    id: 'GravitasSpaceStation5',
    name: 'Destroyed Satellite',
    recharge: range(30000, 60000),
    destroyOnHarvest: false,
  },
  {
    id: 'GravitasSpaceStation6',
    name: 'Annihilated Satellite',
    recharge: range(30000, 60000),
    destroyOnHarvest: false,
  },
  {
    id: 'GravitasSpaceStation7',
    name: 'Wrecked Space Shuttle',
    recharge: range(30000, 60000),
    destroyOnHarvest: false,
  },
  {
    id: 'GravitasSpaceStation8',
    name: 'Obsolete Space Station Module',
    recharge: range(30000, 60000),
    destroyOnHarvest: false,
  },
  {
    id: 'RussellsTeapot',
    name: "Russell's Teapot",
    recharge: range(30000, 60000),
    artifact: 'artifact_TeaPot',
    destroyOnHarvest: true,
  },
]

/**
 * The type every harvestable POI's artifact side carries (`ArtifactPOIConfigurator
 * .defaultArtifactPoiType`); the artifact is picked when the POI charges.
 */
export const defaultArtifactPoiType: ArtifactPoiType = {
  id: 'HarvestablePOIArtifacts',
  name: 'Harvestable POI artifacts',
  recharge: range(30000, 60000),
  destroyOnHarvest: false,
}
