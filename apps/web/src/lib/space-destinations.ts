/**
 * Space destination types (base game starmap) and how much of each can be recovered.
 *
 * Transcribed from the `SpaceDestinationType` constructor calls in `SpaceDestinationTypes`
 * (Assembly-CSharp). A destination's saved `availableMass` is the mass above `min` it still
 * holds, so it ranges from 0 up to `max - min`. `tests/space-edits.test.ts` checks every
 * destination in the fixtures against these.
 */

export interface DestinationType {
  id: string
  /** Kilograms the destination holds when full, counting the part that is never recovered. */
  max: number
  /** Kilograms that can never be recovered. */
  min: number
}

export const destinationTypes: DestinationType[] = [
  { id: 'Satellite', max: 64000000, min: 63994000 },
  { id: 'MetallicAsteroid', max: 128000000, min: 127988000 },
  { id: 'RockyAsteroid', max: 128000000, min: 127988000 },
  { id: 'CarbonaceousAsteroid', max: 128000000, min: 127988000 },
  { id: 'IcyDwarf', max: 256000000, min: 255982000 },
  { id: 'OrganicDwarf', max: 256000000, min: 255982000 },
  { id: 'DustyMoon', max: 256000000, min: 255982000 },
  { id: 'TerraPlanet', max: 384000000, min: 383980000 },
  { id: 'VolcanoPlanet', max: 384000000, min: 383980000 },
  { id: 'GasGiant', max: 384000000, min: 383980000 },
  { id: 'IceGiant', max: 384000000, min: 383980000 },
  { id: 'SaltDwarf', max: 256000000, min: 255982000 },
  { id: 'RustPlanet', max: 384000000, min: 383980000 },
  { id: 'ForestPlanet', max: 384000000, min: 383980000 },
  { id: 'RedDwarf', max: 256000000, min: 255982000 },
  { id: 'GoldAsteroid', max: 128000000, min: 127988000 },
  { id: 'HeliumGiant', max: 384000000, min: 383980000 },
  { id: 'OilyAsteriod', max: 128000000, min: 127988000 },
  { id: 'ShinyPlanet', max: 384000000, min: 383980000 },
  { id: 'ChlorinePlanet', max: 256000000, min: 255982000 },
  { id: 'SaltDesertPlanet', max: 384000000, min: 383980000 },
  { id: 'Wormhole', max: 0, min: 0 },
  { id: 'Earth', max: 0, min: 0 },
  { id: 'DLC2CeresSpaceDestination', max: 384000000, min: 383980000 },
  { id: 'DLC4PrehistoricSpaceDestination', max: 384000000, min: 383980000 },
  { id: 'DLC4PrehistoricDemoliorSpaceDestination', max: 384000000, min: 383980000 },
  { id: 'DLC4PrehistoricDemoliorSpaceDestination2', max: 384000000, min: 383980000 },
  { id: 'DLC4PrehistoricDemoliorSpaceDestination3', max: 384000000, min: 383980000 },
  { id: 'DLC5AquaticSpaceDestination', max: 384000000, min: 383980000 },
]

const byId = new Map(destinationTypes.map((t) => [t.id, t]))

/** Kilograms a destination of this type can hold above its floor; 0 for ones nothing can be taken from. */
export function destinationCapacity(type: string): number | undefined {
  const t = byId.get(type)
  return t ? t.max - t.min : undefined
}
