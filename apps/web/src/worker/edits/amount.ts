import { critterAmountMax } from '@oni-duplicity/game-data'
import type { SaveGame } from '@oni-duplicity/save-parser'
import type { Edit } from '../edit-types.ts'
import { behavior, dlcIds, objectById, splitId } from '../save-helpers.ts'
import { applyObjectEdit } from './duplicant.ts'

export function applySetAmount(save: SaveGame, edit: Extract<Edit, { type: 'setAmount' }>): void {
  if (!Number.isFinite(edit.value)) throw new Error('An amount must be a finite number')
  const obj = objectById(save, edit.id)
  let value = edit.value
  if (behavior(obj, 'CreatureBrain')?.templateData) {
    // A critter's maximum comes from the game's data, so refuse what isn't confirmed.
    const limit = critterAmountMax(splitId(edit.id).group, edit.amountId, dlcIds(save))
    if (limit.max === undefined) throw new Error(`${edit.amountId} is read only: ${limit.reason}`)
    value = Math.min(Math.max(value, 0), limit.max)
  }
  applyObjectEdit(obj, { ...edit, value }, { prefab: splitId(edit.id).group, dlcIds: dlcIds(save) })
}
