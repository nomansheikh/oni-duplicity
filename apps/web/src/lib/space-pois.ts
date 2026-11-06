import artifactData from '../data/artifact-pois.json'
import harvestableData from '../data/harvestable-pois.json'

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

// The tables live in JSON: `data/harvestable-pois.json` and `data/artifact-pois.json`.
export const harvestablePoiTypes = harvestableData as HarvestablePoiType[]

export const artifactPoiTypes = artifactData as ArtifactPoiType[]

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
