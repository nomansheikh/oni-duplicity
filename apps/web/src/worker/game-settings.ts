import { findGameSetting, humanize } from '@oni-duplicity/game-data'
import type { SaveGame } from '@oni-duplicity/save-parser'
import type { GameSettingView } from './view-types.ts'

function qualityLevels(save: SaveGame): [string, string][] {
  const settings = save.gameData.customGameSettings as {
    CurrentQualityLevelsBySetting?: [string, string][]
  }
  return settings?.CurrentQualityLevelsBySetting ?? []
}

export function setQualityLevel(save: SaveGame, settingId: string, level: string): void {
  const entry = qualityLevels(save).find(([id]) => id === settingId)
  if (entry) entry[1] = level
}

/** Settings stored in the save that describe the world rather than difficulty. */
const WORLD_SETTINGS = new Set(['ClusterLayout', 'WorldgenSeed'])

export function listGameSettings(save: SaveGame): GameSettingView[] {
  return qualityLevels(save)
    .filter(([id]) => !WORLD_SETTINGS.has(id))
    .map(([id, current]) => {
      const entry = findGameSetting(id)
      const levels = (entry?.levels ?? []).filter((l) => /^[A-Z][A-Za-z0-9]*$/.test(l.id))
      return {
        id,
        name: entry?.name ?? humanize(id),
        ...(entry?.desc ? { desc: entry.desc } : {}),
        current,
        levels: levels.map((l) => ({
          id: l.id,
          name: l.name,
          ...(l.desc ? { desc: l.desc } : {}),
        })),
        editable: levels.some((l) => l.id === current),
      }
    })
}
