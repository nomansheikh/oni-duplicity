import { elements as elementCatalog, findElementByHash, humanize } from '@oni-duplicity/game-data'
import type { GameObject, SaveGame, StoredItem } from '@oni-duplicity/save-parser'
import { behavior, objectById } from './save-helpers.ts'

export const ELEMENT_IDS = new Set(elementCatalog.map((e) => e.id))

export interface MaterialItem {
  ref: string
  obj: GameObject
  owner: GameObject
  where: string
  loose: boolean
}

/** A loose chunk: an object in a group named after an element, with its own mass. */
export function isLooseChunk(groupName: string, obj: GameObject): boolean {
  return ELEMENT_IDS.has(groupName) && !!behavior(obj, 'PrimaryElement')?.templateData
}

/** Loose chunks (groups named after an element) and items held in storages. */
export function allMaterialItems(save: SaveGame): MaterialItem[] {
  const items: MaterialItem[] = []
  for (const group of save.gameObjects) {
    group.gameObjects.forEach((obj, index) => {
      const id = `${group.name}:${index}`
      if (isLooseChunk(group.name, obj)) {
        items.push({ ref: id, obj, owner: obj, where: 'Loose', loose: true })
      }
      obj.behaviors.forEach((b, bIndex) => {
        if (b.name !== 'Storage' || !Array.isArray(b.extraData)) return
        ;(b.extraData as StoredItem[]).forEach((item, iIndex) => {
          if (ELEMENT_IDS.has(item.name) && behavior(item, 'PrimaryElement')?.templateData) {
            items.push({
              ref: `${id}/${bIndex}/${iIndex}`,
              obj: item,
              owner: obj,
              where: humanize(group.name),
              loose: false,
            })
          }
        })
      })
    })
  }
  return items
}

export function elementOf(obj: GameObject): string | undefined {
  const hash = Number(behavior(obj, 'PrimaryElement')?.templateData?.ElementID)
  return findElementByHash(hash)?.id
}

export function materialItems(save: SaveGame, elementId: string): MaterialItem[] {
  return allMaterialItems(save).filter((item) => elementOf(item.obj) === elementId)
}

export function itemByRef(save: SaveGame, ref: string): GameObject {
  const [ownerId, bIndex, iIndex] = ref.split('/')
  const owner = objectById(save, ownerId!)
  if (bIndex === undefined) return owner
  const stored = owner.behaviors[Number(bIndex)]?.extraData as StoredItem[] | undefined
  const item = stored?.[Number(iIndex)]
  if (!item) throw new Error(`No stored item ${ref}`)
  return item
}
