import { defaultArtifactPoiType } from '../lib/space-pois.ts'
import type { SaveGame } from '@oni-duplicity/save-parser'
import {
  POINTS_TO_REVEAL,
  readFog,
  revealLevel,
  revealPoints,
  saveGameController,
} from './pois-fog.ts'
import {
  artifactByHash,
  artifactByPrefab,
  artifactView,
  elementShares,
  harvestableByHash,
  harvestableByPrefab,
  location,
  mix,
  waitingArtifacts,
} from './pois-lookup.ts'
import { readArtifactState, readHarvestState } from './pois-state.ts'
import type { PoiOverview, PoiView } from './pois-types.ts'

// Spaced Out points of interest, read-only.
//
// A POI's location is plain template data (`m_location`), but its roll and its charge live in
// the `StateMachineController` extra bytes, which hold one serialized state machine instance per
// state machine on the object: `HarvestablePOIStates` and, for most harvestable POIs, an
// `ArtifactPOIStates` as well. Both are read by looking for the instance's type name and reading
// the fields behind it; anything that does not look as expected is left out rather than guessed.

export type { PoiOverview, PoiView, RevealLevel } from './pois-types.ts'
export { readArtifactState, readHarvestState, type HarvestState } from './pois-state.ts'
export {
  POINTS_TO_REVEAL,
  readFog,
  readRevealPoints,
  saveGameController,
  type FogLayout,
} from './pois-fog.ts'
export { harvestableByHash, harvestableByPrefab, mix } from './pois-lookup.ts'

/** Every Spaced Out point of interest in the save, harvestable ones first. */
export function listPois(save: SaveGame): PoiView[] {
  const points = revealPoints(save)
  const waiting = waitingArtifacts(save)
  const pois: PoiView[] = []
  for (const group of save.gameObjects) {
    const harvestable = harvestableByPrefab.get(group.name)
    const artifact = artifactByPrefab.get(group.name)
    if (!harvestable && !artifact) continue
    group.gameObjects.forEach((obj, index) => {
      const loc = location(
        obj,
        harvestable ? 'HarvestablePOIClusterGridEntity' : 'ArtifactPOIClusterGridEntity',
      )
      if (!loc) return
      const bytes = obj.behaviors.find((b) => b.name === 'StateMachineController')?.extraRaw
      const base = {
        id: `${group.name}:${index}`,
        location: loc,
        reveal: revealLevel(points, loc.r, loc.q),
      }
      const artifactState = bytes ? readArtifactState(bytes) : null
      const waitingHere = waiting.get(`${loc.r},${loc.q}`)
      if (harvestable) {
        const state = bytes ? readHarvestState(bytes) : null
        // The roll fixes the type's range; a hash that is not the prefab's type is not trusted.
        const trusted = state && harvestableByHash.get(state.hash) === harvestable
        const max = trusted ? mix(harvestable.capacity, state.capacityRoll) : undefined
        pois.push({
          ...base,
          kind: 'harvestable',
          type: harvestable.id,
          name: harvestable.name,
          ...(trusted && max !== undefined
            ? {
                harvest: {
                  current: state.capacity,
                  max,
                  rechargeSeconds: mix(harvestable.recharge, state.rechargeRoll),
                  elements: elementShares(harvestable),
                },
              }
            : {}),
          ...(artifactState
            ? { artifact: artifactView(artifactState, defaultArtifactPoiType, waitingHere) }
            : {}),
        })
      } else if (artifact) {
        pois.push({
          ...base,
          kind: 'artifact',
          type: artifact.id,
          name: artifact.name,
          ...(artifactState && artifactByHash.get(artifactState.hash) === artifact
            ? { artifact: artifactView(artifactState, artifact, waitingHere) }
            : {}),
        })
      }
    })
  }
  return pois.sort(
    (a, b) =>
      Number(a.kind === 'artifact') - Number(b.kind === 'artifact') ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id, undefined, { numeric: true }),
  )
}

export function listPoiOverview(save: SaveGame): PoiOverview {
  const controller = saveGameController(save)
  const fog = controller ? readFog(controller.extraRaw) : null
  const pending = fog ? [...fog.points.values()].filter((v) => v < POINTS_TO_REVEAL).length : 0
  return {
    pois: listPois(save),
    reveal: fog ? { cells: fog.count, pending } : null,
  }
}
