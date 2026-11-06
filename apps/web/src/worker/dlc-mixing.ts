import { humanize } from '@oni-duplicity/game-data'
import type { SaveGame } from '@oni-duplicity/save-parser'

export interface MixingEntry {
  id: string
  name: string
  kind: 'dlc' | 'world' | 'subworld'
  level: string
  levelName: string
}

export interface MixingView {
  entries: MixingEntry[]
}

/**
 * `CustomMixingSettingsConfigs`: the first group is `DlcMixingSettingConfig` (ids are DLC ids),
 * then `WorldMixingSettingConfig`, then `SubworldMixingSettingConfig`. Display names live in the
 * game's string tables, which the decompile does not carry; they are derived from the ids.
 */
const DLC_NAMES: Record<string, string> = {
  DLC2_ID: 'Frosty Planet Pack',
  DLC3_ID: 'Bionic Booster Pack',
  DLC4_ID: 'Prehistoric Planet Pack',
  DLC5_ID: 'Aquatic Planet Pack',
}
const WORLD_MIXING = new Set([
  'CeresAsteroidMixing',
  'PrehistoricAsteroidMixing',
  'AquaticAsteroidMixing',
])
const LEVEL_NAMES: Record<string, string> = {
  Disabled: 'Disabled',
  Enabled: 'Enabled',
  TryMixing: 'Try mixing',
  // sic: the game's own level id.
  GuranteeMixing: 'Guaranteed',
}

export function readMixing(save: SaveGame): MixingView | null {
  const settings = save.gameData.customGameSettings as
    | { CurrentMixingLevelsBySetting?: [string, string][] }
    | undefined
  const levels = settings?.CurrentMixingLevelsBySetting
  // Saves from before world mixing existed do not have the key.
  if (!Array.isArray(levels)) return null
  return {
    entries: levels.map(([id, level]) => {
      const kind =
        id in DLC_NAMES || id.endsWith('_ID') ? 'dlc' : WORLD_MIXING.has(id) ? 'world' : 'subworld'
      const name =
        kind === 'dlc' ? (DLC_NAMES[id] ?? humanize(id)) : humanize(id.replace(/Mixing$/, ''))
      return { id, name, kind, level, levelName: LEVEL_NAMES[level] ?? humanize(level) }
    }),
  }
}
