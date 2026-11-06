import { findDestinationName, findPrefabName, humanize } from '@oni-duplicity/game-data'
import { geyserName } from '@/lib/seed-draw/geyser-marks'
import { artifactPoiTypes, harvestablePoiTypes } from '@/lib/space-pois'
import type { DetailMarker, MarkerKind } from '@/seed/details/types'

/** The game's name for a marker: a geyser type, or a placed building or creature. */
export function markerName(marker: Pick<DetailMarker, 'kind' | 'tag'>): string {
  if (marker.kind === 'geyser') return geyserName(marker.tag)
  return findPrefabName(marker.tag) ?? humanize(marker.tag)
}

export const MARKER_KINDS: { kind: MarkerKind; label: string }[] = [
  { kind: 'geyser', label: 'Geysers' },
  { kind: 'oil', label: 'Oil' },
  { kind: 'gravitas', label: 'Gravitas' },
  { kind: 'notable', label: 'Other' },
]

const HARVESTABLE = 'HarvestableSpacePOI_'
const ARTIFACT = 'ArtifactSpacePOI_'

/** The game's name for a Spaced Out space POI type as the generator reports it. */
export function poiName(type: string): string {
  if (type.startsWith(HARVESTABLE)) {
    const id = type.slice(HARVESTABLE.length)
    return harvestablePoiTypes.find((p) => p.id === id)?.name ?? humanize(id)
  }
  if (type.startsWith(ARTIFACT)) {
    const id = type.slice(ARTIFACT.length)
    return artifactPoiTypes.find((p) => p.id === id)?.name ?? humanize(id)
  }
  // The game files the temporal tear under the `Wormhole` destination type.
  if (type === 'TemporalTear') return findDestinationName('Wormhole') ?? humanize(type)
  return humanize(type)
}

export function poiKind(type: string): 'harvestable' | 'artifact' | 'other' {
  if (type.startsWith(HARVESTABLE)) return 'harvestable'
  if (type.startsWith(ARTIFACT)) return 'artifact'
  return 'other'
}
