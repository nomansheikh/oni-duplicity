import type { Behavior, GameObject, SaveGame } from '@oni-duplicity/save-parser'
import {
  mix,
  POINTS_TO_REVEAL,
  harvestableByHash,
  harvestableByPrefab,
  readFog,
  readHarvestState,
  saveGameController,
} from './pois.ts'

/** Positions where two byte arrays differ. */
function differing(a: Uint8Array, b: Uint8Array): number[] {
  const at: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) at.push(i)
  return at
}

/**
 * Applies a change to a copy of the behavior's bytes, then checks that the length is the same and
 * that only bytes inside the given ranges changed, before swapping the copy in. The copy keeps
 * undo simple: the old array is restored by reference.
 */
function rewrite(
  behavior: Behavior,
  allowed: [number, number][],
  change: (view: DataView) => void,
): void {
  const before = behavior.extraRaw
  const next = before.slice()
  change(new DataView(next.buffer, next.byteOffset, next.byteLength))
  if (next.length !== before.length) throw new Error('The edit changed the byte length')
  const outside = differing(before, next).filter(
    (i) => !allowed.some(([start, end]) => i >= start && i < end),
  )
  if (outside.length > 0) throw new Error('The edit changed bytes it should not touch')
  behavior.extraRaw = next
}

export function revealStarmap(save: SaveGame): void {
  const controller = saveGameController(save)
  const fog = controller ? readFog(controller.extraRaw) : null
  if (!controller || !fog) throw new Error('Could not read the starmap reveal state')
  const pending = [...fog.points.values()].filter((v) => v < POINTS_TO_REVEAL).length
  if (pending === 0) throw new Error('Every known starmap cell is already revealed')
  rewrite(controller, [[fog.valuesAt, fog.valuesAt + fog.count * 4]], (view) => {
    for (let i = 0; i < fog.count; i++) {
      const at = fog.valuesAt + i * 4
      if (view.getFloat32(at, true) < POINTS_TO_REVEAL) view.setFloat32(at, POINTS_TO_REVEAL, true)
    }
  })
  // Reading it back must show every known cell revealed and the same cells.
  const after = readFog(controller.extraRaw)
  if (
    !after ||
    after.count !== fog.count ||
    [...after.points].some(([key, v]) => !fog.points.has(key) || v < POINTS_TO_REVEAL)
  ) {
    throw new Error('The starmap reveal state did not read back as written')
  }
}

function poiObject(save: SaveGame, id: string): { obj: GameObject; prefab: string } {
  const split = id.lastIndexOf(':')
  const prefab = id.slice(0, split)
  const obj = save.gameObjects.find((g) => g.name === prefab)?.gameObjects[
    Number(id.slice(split + 1))
  ]
  if (!obj) throw new Error(`No object ${id}`)
  return { obj, prefab }
}

/** EXPERIMENTAL: sets a harvestable POI's stock in both places the save keeps it. */
export function setPoiStock(save: SaveGame, id: string, kg: number): void {
  if (!Number.isFinite(kg)) throw new Error('Stock must be a number')
  const { obj, prefab } = poiObject(save, id)
  const type = harvestableByPrefab.get(prefab)
  const controller = obj.behaviors.find((b) => b.name === 'StateMachineController')
  if (!type || !controller) throw new Error('This is not a harvestable POI')
  const state = readHarvestState(controller.extraRaw)
  if (!state || harvestableByHash.get(state.hash) !== type) {
    throw new Error('Could not read this POI’s stock')
  }
  const max = mix(type.capacity, state.capacityRoll)
  const value = Math.fround(Math.min(max, Math.max(0, kg)))
  rewrite(
    controller,
    [
      [state.capacityAt, state.capacityAt + 4],
      [state.parameterAt, state.parameterAt + 4],
    ],
    (view) => {
      view.setFloat32(state.capacityAt, value, true)
      view.setFloat32(state.parameterAt, value, true)
    },
  )
  const after = readHarvestState(controller.extraRaw)
  if (!after || after.capacity !== value || after.hash !== state.hash) {
    throw new Error('The POI stock did not read back as written')
  }
}
