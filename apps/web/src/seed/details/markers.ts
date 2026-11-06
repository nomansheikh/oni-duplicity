import type { MarkerKind } from './types.ts'

/**
 * The placed buildings and creatures worth a marker, by game prefab name. The worldgen
 * `buildings` and `other_entities` lists hold thousands of tiles, wires and plants; these are
 * the ones a player plans a base around. The labels come from the game's strings.
 */
const NOTABLE: Record<string, MarkerKind> = {
  Headquarters: 'notable',
  SapTree: 'notable',
  GeneShuffler: 'gravitas',
  VendingMachine: 'gravitas',
  CryoTank: 'gravitas',
  MassiveHeatSink: 'gravitas',
  TemporalTearOpener: 'gravitas',
  WarpPortal: 'gravitas',
  WarpReceiver: 'gravitas',
}

/** The oil reservoir prefab; the exact tag skips the `Oilfloater` critters. */
export const OIL_WELL_TAG = 'OilWell'

export function markerKind(tag: string): MarkerKind | undefined {
  if (tag === OIL_WELL_TAG) return 'oil'
  return NOTABLE[tag]
}
