import type { GameObject, SaveGame } from '@oni-duplicity/save-parser'
import { demoliorObjects } from './dlc.ts'
import type { Edit } from './edit-types.ts'
import { materialItems } from './material-items.ts'
import { objectById, objectsWith, saveGameObject } from './save-helpers.ts'

/** The game objects an edit may change, for undo snapshots. */
export function touchedBy(save: SaveGame, edit: Edit): GameObject[] {
  if (edit.type === 'setDemoliorImpact') return demoliorObjects(save)
  if (edit.type === 'bulkDuplicants') {
    return objectsWith(save, 'MinionIdentity').map(({ obj }) => obj)
  }
  if (edit.type === 'cloneDuplicant') {
    // The schedules live on the SaveGame object.
    const saveGame = saveGameObject(save)
    return saveGame ? [objectById(save, edit.id), saveGame] : [objectById(save, edit.id)]
  }
  if ('id' in edit) return [objectById(save, edit.id)]
  if ('ref' in edit) return [objectById(save, edit.ref.split('/')[0]!)]
  if ('elementId' in edit)
    return [...new Set(materialItems(save, edit.elementId).map((i) => i.owner))]
  const saveGame = saveGameObject(save)
  return saveGame ? [saveGame] : []
}
