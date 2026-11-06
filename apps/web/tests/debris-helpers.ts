import { elements } from '@oni-duplicity/game-data'
import {
  parseSave,
  writeSaveParts,
  type GameObject,
  type SaveGame,
} from '@oni-duplicity/save-parser'
import { readFileSync } from 'node:fs'
import { listMaterialItems, listMaterials, type MaterialItemView } from '../src/worker/model.ts'

export const ELEMENT_IDS = new Set(elements.map((e) => e.id))
export const load = (path: string) => parseSave(readFileSync(path))
export const body = (save: SaveGame) => writeSaveParts(save).body.slice()
export const hasPrimary = (o: GameObject) => o.behaviors.some((b) => b.name === 'PrimaryElement')

/** Every loose item of every element, with the views the app shows. */
export function looseItems(save: SaveGame): MaterialItemView[] {
  return listMaterials(save).flatMap((m) =>
    listMaterialItems(save, m.id).filter((item) => item.loose),
  )
}

export const groupOf = (ref: string) => ref.slice(0, ref.lastIndexOf(':'))
export const indexOf = (ref: string) => Number(ref.slice(ref.lastIndexOf(':') + 1))
export const instanceOf = (obj: GameObject) =>
  obj.behaviors.find((b) => b.name === 'KPrefabID')?.templateData?.InstanceID as number

/** The loose items of one element, as the app lists them (positions in list order). */
export const itemsOf = (save: SaveGame, elementId: string) =>
  listMaterialItems(save, elementId).filter((item) => item.loose)
