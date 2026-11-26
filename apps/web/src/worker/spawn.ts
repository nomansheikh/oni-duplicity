import { elements as elementCatalog } from '@oni-duplicity/game-data'
import type { GameObject, SaveGame } from '@oni-duplicity/save-parser'
import { allMaterialItems, elementOf } from './material-items.ts'
import { behavior, data } from './save-helpers.ts'
import { MAX_CHUNK_MASS, MAX_KELVIN, MAX_SPAWN_MASS } from './spawn-limits.ts'
import { assignNewIds, cloneValue } from './structure.ts'

export { MAX_CHUNK_MASS, MAX_KELVIN, MAX_SPAWN_MASS } from './spawn-limits.ts'

/** The printing pod's prefab; new chunks drop at its base, which is never a solid tile. */
const POD_PREFAB = 'Headquarters'

function stateOf(elementId: string): string | undefined {
  return elementCatalog.find((e) => e.id === elementId)?.state
}

/**
 * The chunk to copy for an element: a loose one first, else one held in a storage. Each element's
 * prefab is built by `GeneratedOre.LoadGeneratedOre` (or its own `IOreConfig`), only when the
 * element has a substance animation and its DLC is enabled, and some add components of their
 * own (`Sublimates`, `Dumpable`). Copying an existing chunk of the same element proves the
 * prefab exists in this save and carries exactly its components.
 */
function templateFor(save: SaveGame, elementId: string): GameObject | undefined {
  let stored: GameObject | undefined
  for (const item of allMaterialItems(save)) {
    if (elementOf(item.obj) !== elementId) continue
    if (item.loose) return item.obj
    stored ??= item.obj
  }
  return stored
}

function podOf(save: SaveGame): GameObject | undefined {
  return save.gameObjects.find((g) => g.name === POD_PREFAB)?.gameObjects[0]
}

const GAS_REFUSAL =
  'Only solids and liquids can be spawned; a loose gas would escape into the world'
const NO_POD_REFUSAL = 'This save has no printing pod to drop the items at'

/**
 * Why an element the save already holds can't be spawned, from its state and the pod alone
 * (cheap enough for the materials list). Undefined when it can.
 */
export function spawnRefusalFor(state: string | undefined, hasPod: boolean): string | undefined {
  if (state !== 'Solid' && state !== 'Liquid') return GAS_REFUSAL
  if (!hasPod) return NO_POD_REFUSAL
  return undefined
}

export const hasPrintingPod = (save: SaveGame): boolean => podOf(save) !== undefined

/** Why an element can't be spawned, or undefined when it can. */
export function spawnRefusal(save: SaveGame, elementId: string): string | undefined {
  const state = stateOf(elementId)
  if (!state) return `${elementId} is not a known element`
  const basic = spawnRefusalFor(state, hasPrintingPod(save))
  if (basic) return basic
  if (!templateFor(save, elementId)) {
    return `There is no ${elementId} anywhere in this save to copy`
  }
  return undefined
}

/** Splits a total into equal chunks of at most `MAX_CHUNK_MASS`. */
export function splitMass(mass: number): number[] {
  const count = Math.ceil(mass / MAX_CHUNK_MASS)
  return Array.from({ length: count }, () => mass / count)
}

/** A fresh chunk: the template's components, with nothing in progress carried over. */
function freshChunk(
  save: SaveGame,
  template: GameObject,
  pod: GameObject,
  mass: number,
  kelvin: number,
): GameObject {
  const chunk = cloneValue(template)
  assignNewIds(save, chunk)
  const kpid = data(chunk, 'KPrefabID')
  kpid.serializedTags = []
  const pe = data(chunk, 'PrimaryElement')
  pe._Temperature = kelvin
  pe.Units = mass
  pe.diseaseID = { hash: 0 }
  pe.diseaseCount = 0
  const clearable = behavior(chunk, 'Clearable')?.templateData
  if (clearable) clearable.isMarkedForClear = false
  const movable = behavior(chunk, 'Movable')?.templateData
  if (movable) {
    movable.isMarkedForMove = false
    movable.storageProxy = null
  }
  const dumpable = behavior(chunk, 'Dumpable')?.templateData
  if (dumpable) dumpable.isMarkedForDumping = false
  const sublimates = behavior(chunk, 'Sublimates')?.templateData
  if (sublimates) sublimates.sublimatedMass = 0
  // Drop at the pod's base cell; the chunk keeps its own depth (the ore layer), not the building's.
  const at = (pod as { position: { x: number; y: number } }).position
  const own = (chunk as { position: { x: number; y: number; z: number } }).position
  ;(chunk as { position: unknown }).position = { x: at.x, y: at.y, z: own.z }
  return chunk
}

/**
 * Adds loose chunks of an element at the printing pod. Refuses gases, unknown elements, saves
 * without a pod or without any of the element to copy, a mass that is not positive or above
 * `MAX_SPAWN_MASS`, and a temperature outside what the game keeps on load. Nothing changes until
 * every check has passed.
 */
export function spawnDebris(save: SaveGame, elementId: string, mass: number, kelvin: number): void {
  const refusal = spawnRefusal(save, elementId)
  if (refusal) throw new Error(refusal)
  if (!Number.isFinite(mass) || mass <= 0) throw new Error('Mass must be above 0 kg')
  if (mass > MAX_SPAWN_MASS) {
    throw new Error(`At most ${MAX_SPAWN_MASS.toLocaleString('en')} kg can be spawned at once`)
  }
  if (!Number.isFinite(kelvin) || kelvin <= 0 || kelvin > MAX_KELVIN) {
    throw new Error(
      `Temperature must be above 0 K and at most ${MAX_KELVIN.toLocaleString('en')} K`,
    )
  }
  if (!Number.isFinite(Number(save.settings.nextUniqueID))) {
    throw new Error('This save has no unique ID counter')
  }
  const template = templateFor(save, elementId)!
  const pod = podOf(save)!
  const chunks = splitMass(mass).map((m) => freshChunk(save, template, pod, m, kelvin))
  let group = save.gameObjects.find((g) => g.name === elementId)
  if (!group) {
    group = { name: elementId, gameObjects: [] } as (typeof save.gameObjects)[number]
    save.gameObjects.push(group)
  }
  group.gameObjects.push(...chunks)
}
