import type { SaveGame } from '@oni-duplicity/save-parser'
import { dlcIds } from '../save-helpers.ts'
import { CLUSTER_PREFIXES } from './cluster-prefixes.ts'
import { MIXING_SETTINGS, qualitySettings, type CoordinateSetting } from './settings-table.ts'

/** `CustomGameSettings.CustomGameMode` */
const SURVIVAL = 0
const NOSWEAT = 1

export interface SeedCoordinate {
  /** The game's settings coordinate, e.g. `SNDST-C-1393183751-0-0-0`. */
  coordinate: string
  clusterId: string
  /** `ClusterLayout.GetCoordinatePrefix()` */
  prefix: string
  /** `WorldgenSeed` */
  seed: string
  /** `GetOtherSettingsCode()`: the difficulty settings. */
  settingsCode: string
  /** `GetStoryTraitSettingsCode()`; see `storyTraitsKnown`. */
  storyCode: string
  /** `GetMixingSettingsCode()` */
  mixingCode: string
  /**
   * Always false. A save stores no story-trait choice: `CurrentStoryLevelsBySetting` is not
   * serialized, so the game itself prints `0` for it after a load. A world that had stories
   * guaranteed at creation has a different real coordinate.
   */
  storyTraitsKnown: false
}

type Levels = [string, string][]

/** `CustomGameSettings.BinarytoBase36`: least-significant digit first. */
function toBase36(value: bigint): string {
  if (value === 0n) return '0'
  let text = ''
  let rest = value
  while (rest > 0n) {
    text += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Number(rest % 36n)]
    rest /= 36n
  }
  return text
}

/** `GetOtherSettingsCode` and its mixing and story twins; null when a level has no value. */
function code(
  settings: CoordinateSetting[],
  level: (setting: CoordinateSetting) => string | undefined,
): string | null {
  let total = 0n
  for (const setting of settings) {
    const value = setting.values[level(setting) ?? setting.default]
    if (value === undefined) return null
    total = total * BigInt(setting.range) + BigInt(value)
  }
  return toBase36(total)
}

/**
 * The coordinate `CustomGameSettings.GetSettingsCoordinate` builds, which the game shows on its
 * pause screen: `<cluster prefix>-<seed>-<settings>-<stories>-<mixing>`. Null when the save lacks
 * a cluster or seed, the cluster has no known prefix, or a setting holds a level the game does
 * not define.
 */
export function seedCoordinate(save: SaveGame): SeedCoordinate | null {
  const settings = save.gameData.customGameSettings as {
    customGameMode?: number
    CurrentQualityLevelsBySetting?: Levels
    CurrentMixingLevelsBySetting?: Levels
  }
  const quality = new Map(settings?.CurrentQualityLevelsBySetting ?? [])
  const mixing = new Map(settings?.CurrentMixingLevelsBySetting ?? [])
  const clusterId = quality.get('ClusterLayout')
  const seed = quality.get('WorldgenSeed')
  const prefix = clusterId ? CLUSTER_PREFIXES[clusterId] : undefined
  if (!clusterId || !seed || !prefix || !/^\d+$/.test(seed)) return null

  const active = new Set(dlcIds(save))
  const owned = (setting: CoordinateSetting) => !setting.requires || active.has(setting.requires)
  const mode = settings.customGameMode
  const settingsCode = code(qualitySettings(!active.has('EXPANSION1_ID')), (s) => {
    // GetCurrentQualitySetting: Survival and Nosweat ignore the stored level.
    if (mode === SURVIVAL) return s.default
    if (mode === NOSWEAT) return s.nosweat
    return owned(s) ? quality.get(s.id) : s.default
  })
  // GetCurrentMixingSettingLevel: the stored level, or the default without the required content.
  const mixingCode = code(MIXING_SETTINGS, (s) => (owned(s) ? mixing.get(s.id) : s.default))
  if (settingsCode === null || mixingCode === null) return null
  const storyCode = '0'
  return {
    coordinate: `${prefix}-${seed}-${settingsCode}-${storyCode}-${mixingCode}`,
    clusterId,
    prefix,
    seed,
    settingsCode,
    storyCode,
    mixingCode,
    storyTraitsKnown: false,
  }
}
