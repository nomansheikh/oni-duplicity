import { findElement, hashString, humanize } from '@oni-duplicity/game-data'
import type { GameObject, SaveGame } from '@oni-duplicity/save-parser'
import {
  artifactPoiTypes,
  defaultArtifactPoiType,
  harvestablePoiTypes,
  type ArtifactPoiType,
  type HarvestablePoiType,
} from '../lib/space-pois.ts'
import type { ArtifactState } from './pois-state.ts'
import type { PoiView } from './pois-types.ts'

export const harvestableByHash = new Map(harvestablePoiTypes.map((t) => [hashString(t.id) | 0, t]))
export const artifactByHash = new Map(
  [...artifactPoiTypes, defaultArtifactPoiType].map((t) => [hashString(t.id) | 0, t]),
)
export const harvestableByPrefab = new Map(
  harvestablePoiTypes.map((t) => [`HarvestableSpacePOI_${t.id}`, t]),
)
export const artifactByPrefab = new Map(
  artifactPoiTypes.map((t) => [`ArtifactSpacePOI_${t.id}`, t]),
)

/** `MathUtil.ReRange(roll, 0, 1, min, max)` in single precision, as the game computes it. */
export const mix = (range: { min: number; max: number }, roll: number) =>
  Math.fround(Math.fround(roll * Math.fround(range.max - range.min)) + range.min)

export function location(obj: GameObject, behaviorName: string): { r: number; q: number } | null {
  const loc = obj.behaviors.find((b) => b.name === behaviorName)?.templateData?.m_location as
    | { r: number; q: number }
    | undefined
  return loc && Number.isFinite(loc.r) && Number.isFinite(loc.q) ? { r: loc.r, q: loc.q } : null
}

export function elementShares(type: HarvestablePoiType): { name: string; share: number }[] {
  const total = type.elements.reduce((sum, [, weight]) => sum + weight, 0)
  return type.elements
    .map(([id, weight]) => ({ name: findElement(id)?.name ?? humanize(id), share: weight / total }))
    .sort((a, b) => b.share - a.share)
}

export function artifactView(
  state: ArtifactState,
  type: ArtifactPoiType | undefined,
  waiting: string | undefined,
): NonNullable<PoiView['artifact']> {
  const range = (type ?? defaultArtifactPoiType).recharge
  const recharge = mix(range, state.rechargeRoll)
  // ArtifactPOIStates.RechargeTimeRemaining: whole cycles of 600 seconds.
  const remainingSeconds = Math.ceil((recharge - recharge * state.charge) / 600) * 600
  return {
    state: state.state,
    charge: state.charge,
    remainingSeconds: Math.max(0, remainingSeconds),
    harvests: state.harvests,
    ...(waiting ? { waiting } : {}),
  }
}

/** Artifacts waiting on the starmap, by tile: the `artifact_*` items in the hex cell inventories. */
export function waitingArtifacts(save: SaveGame): Map<string, string> {
  const waiting = new Map<string, string>()
  const group = save.gameObjects.find((g) => g.name === 'StarmapHexCellInventory')
  for (const obj of group?.gameObjects ?? []) {
    const loc = location(obj, 'StarmapHexCellInventoryVisuals')
    const items = obj.behaviors.find((b) => b.name === 'StarmapHexCellInventory')?.templateData
      ?.Items as { ID?: { name?: string } }[] | undefined
    const artifact = items?.map((i) => i.ID?.name).find((n) => n?.startsWith('artifact_'))
    if (loc && artifact) waiting.set(`${loc.r},${loc.q}`, artifact)
  }
  return waiting
}
