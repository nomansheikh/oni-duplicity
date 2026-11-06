import { MAX_VERIFIED_MINOR, type SaveGame } from '@oni-duplicity/save-parser'
import { behavior, dlcIds, saveGameObject } from '../save-helpers.ts'
import type { Summary } from '../view-types.ts'

export function summarize(save: SaveGame, fileName: string): Summary {
  const info = save.header.gameInfo
  const saveGame = saveGameObject(save)
  const sandbox = saveGame
    ? behavior(saveGame, 'SaveGame')?.templateData?.sandboxEnabled
    : undefined
  return {
    fileName,
    baseName: info.baseName,
    cycles: info.numberOfCycles,
    duplicants: info.numberOfDuplicants,
    version: `${info.saveMajorVersion}.${info.saveMinorVersion}`,
    buildVersion: save.header.buildVersion,
    dlcIds: dlcIds(save),
    clusterId: info.clusterId ?? '',
    isAutoSave: info.isAutoSave,
    originalSaveName: typeof info.originalSaveName === 'string' ? info.originalSaveName : '',
    sandbox: Boolean(sandbox ?? info.sandboxEnabled),
    debugWasUsed: save.gameData.debugWasUsed === true,
    unverified: info.saveMinorVersion > MAX_VERIFIED_MINOR,
    warnings: save.warnings,
  }
}
