import { techs as techCatalog } from '@oni-duplicity/game-data'
import type { SaveGame } from '@oni-duplicity/save-parser'
import { cloneDuplicant } from '../clone.ts'
import { setDemoliorImpact } from '../dlc.ts'
import { assignNewIds, cloneValue, locate } from '../structure.ts'
import { assertNotMarkedForMove, deleteDebris, markedForMoveIds } from '../debris.ts'
import type { Edit } from '../edit-types.ts'
import { setQualityLevel } from '../game-settings.ts'
import { itemByRef, materialItems } from '../material-items.ts'
import { behavior, objectById, primary, saveGameObject } from '../save-helpers.ts'
import { setTech } from '../research.ts'
import { applySpaceEdit } from '../space-edits.ts'
import { applySetAmount } from './amount.ts'
import { applyBulk } from './bulk.ts'
import { applyObjectEdit } from './duplicant.ts'
import { setGeyserType, setGeyserValue } from './geyser.ts'
import { applyRawEdit } from './raw.ts'
import { dlcIds, splitId } from '../save-helpers.ts'

export function applyEdit(save: SaveGame, edit: Edit): void {
  switch (edit.type) {
    case 'setColonyName':
      save.header.gameInfo.baseName = edit.name
      return
    case 'setSandbox': {
      save.header.gameInfo.sandboxEnabled = edit.enabled
      const obj = saveGameObject(save)
      const saveGame = obj ? behavior(obj, 'SaveGame')?.templateData : undefined
      if (saveGame) saveGame.sandboxEnabled = edit.enabled
      setQualityLevel(save, 'SandboxMode', edit.enabled ? 'Enabled' : 'Disabled')
      return
    }
    case 'setGeyserName': {
      const nameable = behavior(objectById(save, edit.id), 'UserNameable')?.templateData
      if (!nameable) throw new Error('This geyser cannot be renamed')
      nameable.savedName = edit.name
      return
    }
    case 'setDebugWasUsed':
      if (!('debugWasUsed' in save.gameData)) throw new Error('This save has no debug flag')
      save.gameData.debugWasUsed = edit.used
      return

    case 'bulkDuplicants':
      applyBulk(save, edit)
      return
    case 'setGeyserValue':
      setGeyserValue(save, edit)
      return

    case 'setGeyserType':
      setGeyserType(save, edit.id, edit.typeId)
      return
    case 'setItemMass':
      primary(itemByRef(save, edit.ref)).Units = Math.max(0, edit.mass)
      return
    case 'setItemTemperature':
      primary(itemByRef(save, edit.ref))._Temperature = Math.max(0, edit.kelvin)
      return
    case 'deleteObject': {
      const { list, index } = locate(save, edit.id)
      assertNotMarkedForMove(list[index]!, markedForMoveIds(save), edit.id)
      list.splice(index, 1)
      return
    }
    case 'deleteDebris':
      deleteDebris(save, edit.ids)
      return
    case 'cloneObject': {
      const { list, index } = locate(save, edit.id)
      const copy = cloneValue(list[index]!)
      assignNewIds(save, copy)
      list.splice(index + 1, 0, copy)
      return
    }
    case 'cloneDuplicant':
      cloneDuplicant(save, edit.id)
      return
    case 'setTechResearched':
      setTech(save, edit.techId, edit.complete)
      return
    case 'researchAll':
      for (const tech of techCatalog) setTech(save, tech.id, true)
      return
    case 'setGameSetting':
      setQualityLevel(save, edit.settingId, edit.level)
      return

    case 'rawSet':
    case 'rawRemove':
    case 'rawDuplicate':
    case 'rawAdd':
      applyRawEdit(save, edit)
      return

    case 'setMaterialTemperature':
      for (const item of materialItems(save, edit.elementId))
        primary(item.obj)._Temperature = edit.kelvin
      return
    case 'scaleMaterialMass':
      for (const item of materialItems(save, edit.elementId)) {
        const pe = primary(item.obj)
        pe.Units = Math.max(0, Number(pe.Units) * edit.factor)
      }
      return
    case 'setDemoliorImpact':
      setDemoliorImpact(save, edit.impactCycle)
      return

    case 'setAmount':
      applySetAmount(save, edit)
      return

    case 'setDestinationMass':
    case 'setDestinationAnalysis':
    case 'revealStarmap':
    case 'setPoiStock':
      applySpaceEdit(save, edit)
      return
    default:
      applyObjectEdit(objectById(save, edit.id), edit, {
        prefab: splitId(edit.id).group,
        dlcIds: dlcIds(save),
      })
  }
}
