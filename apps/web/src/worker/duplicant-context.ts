import { traitUnavailable } from '@oni-duplicity/game-data'
import type { GameObject } from '@oni-duplicity/save-parser'
import { modelLabel } from '../lib/profile.ts'
import { modelOf } from './save-helpers.ts'

/** What an edit to one duplicant needs to know about it and the save. */
export interface DuplicantContext {
  prefab: string
  dlcIds: string[]
}

/** Refuses trait IDs the duplicant's model or the save's DLC rule out, before anything changes. */
export function assertTraitsAllowed(
  ids: readonly string[],
  obj: GameObject,
  ctx: DuplicantContext,
): void {
  const model = modelOf(obj, ctx.prefab)
  for (const id of ids) {
    const reason = traitUnavailable(id, model, ctx.dlcIds)
    if (reason === 'model') {
      throw new Error(`${id} is not a trait ${modelLabel(model)} duplicants can have`)
    }
    if (reason === 'dlc') throw new Error(`${id} needs a DLC this save does not have`)
    if (reason === 'inert') throw new Error(`${id} is not a trait the game defines`)
  }
}
