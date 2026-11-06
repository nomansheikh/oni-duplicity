import { mixingSections, mixingSettings, type MixingSetting } from '@oni-duplicity/game-data'
import { asteroidRemixSlots, biomeRemixSlots, isSpacedOut, type SeedCluster } from './clusters.ts'

/**
 * The Mixing tab of a new game as data: setting id to level value (`0` Disabled, `1` Enabled or
 * Likely, `2` Guaranteed). A missing setting is Disabled.
 */
export type MixingLevels = Record<string, number>

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * The mixing part of a coordinate, as `CustomGameSettings.GetMixingSettingsCode` writes it: each
 * setting in registration order folds in as `code * range + level`, and the number is written in
 * base 36 with the least significant digit first.
 */
export function encodeMixing(levels: MixingLevels, settings = mixingSettings): string {
  let value = 0n
  for (const setting of settings) {
    const level = levels[setting.id] ?? 0
    const known = setting.levels.some((l) => l.value === level)
    value = value * BigInt(setting.range) + BigInt(known ? level : 0)
  }
  if (value === 0n) return '0'
  let code = ''
  while (value > 0n) {
    code += DIGITS[Number(value % 36n)]
    value /= 36n
  }
  return code
}

/** Reads a mixing code back (`ParseAndApplyMixingSettingsCode`); only non-zero levels are kept. */
export function decodeMixing(code: string, settings = mixingSettings): MixingLevels {
  let value = 0n
  for (let i = code.length - 1; i >= 0; i--) {
    const digit = DIGITS.indexOf(code[i]!.toUpperCase())
    if (digit < 0) return {}
    value = value * 36n + BigInt(digit)
  }
  const levels: MixingLevels = {}
  for (const setting of [...settings].reverse()) {
    const range = BigInt(setting.range)
    const level = Number(value % range)
    value /= range
    if (level !== 0) levels[setting.id] = level
  }
  return levels
}

/** The DLCs a game needs: the cluster's own and every DLC whose content toggle is on. */
export function dlcsInPlay(cluster: SeedCluster, levels: MixingLevels): string[] {
  const dlcs = new Set(cluster.requiredDlcIds)
  for (const setting of mixingSettings) {
    if (setting.kind === 'dlc' && (levels[setting.id] ?? 0) > 0) dlcs.add(setting.id)
  }
  return [...dlcs]
}

/**
 * Whether the game offers a setting for this cluster with these levels. A DLC toggle is gone when
 * the cluster needs that DLC anyway (`RemoveInvalidMixingSettings` forces it off); a remix needs
 * its DLC in play, a cluster without its forbidden tags and a slot to fill; asteroid remixes are a
 * Spaced Out feature (`MixingContentPanel` hides them otherwise).
 */
export function mixingAvailable(
  setting: MixingSetting,
  cluster: SeedCluster,
  levels: MixingLevels,
): boolean {
  if (setting.kind === 'dlc') return !cluster.requiredDlcIds.includes(setting.id)
  if (setting.forbiddenClusterTags.some((tag) => cluster.tags.includes(tag))) return false
  const inPlay = dlcsInPlay(cluster, levels)
  if (!setting.requiredDlcIds.every((id) => inPlay.includes(id))) return false
  if (setting.kind === 'world') return isSpacedOut(cluster) && asteroidRemixSlots(cluster) > 0
  return biomeRemixSlots(cluster) > 0
}

/** The settings that apply to a cluster at all, whatever the levels: what the Mixing tab lists. */
export function mixingFor(cluster: SeedCluster): MixingSetting[] {
  const everything = Object.fromEntries(mixingSettings.map((s) => [s.id, 1]))
  return mixingSettings.filter((setting) => mixingAvailable(setting, cluster, everything))
}

/**
 * Drops levels the cluster cannot use, as the game does when the cluster or a toggle changes. A
 * DLC toggle never depends on another setting, so one pass settles the remixes that need it.
 */
export function fitMixing(cluster: SeedCluster, levels: MixingLevels): MixingLevels {
  const fitted: MixingLevels = {}
  for (const setting of mixingSettings) {
    const level = levels[setting.id] ?? 0
    const valid = setting.levels.some((l) => l.value === level)
    if (level > 0 && valid && mixingAvailable(setting, cluster, levels)) fitted[setting.id] = level
  }
  return fitted
}

/** The highest level value of a setting, its Guaranteed level for a remix. */
export const topLevel = (setting: MixingSetting) => Math.max(...setting.levels.map((l) => l.value))

/** Guaranteed remixes the cluster has room for, by kind; the game will not start past them. */
export function guaranteeRoom(
  cluster: SeedCluster,
  levels: MixingLevels,
): { world: number; subworld: number } {
  const used = { world: 0, subworld: 0 }
  for (const setting of mixingSettings) {
    if (setting.kind !== 'dlc' && (levels[setting.id] ?? 0) === topLevel(setting)) {
      used[setting.kind]++
    }
  }
  return {
    world: asteroidRemixSlots(cluster) - used.world,
    subworld: biomeRemixSlots(cluster) - used.subworld,
  }
}

/**
 * Why the game would not start with these levels, or null. Like the Mixing tab, it allows more
 * Guaranteed remixes than the cluster has room for but blocks the launch.
 */
export function mixingBlocker(cluster: SeedCluster, levels: MixingLevels): string | null {
  const room = guaranteeRoom(cluster, levels)
  const slots = { world: asteroidRemixSlots(cluster), subworld: biomeRemixSlots(cluster) }
  for (const section of mixingSections) {
    if (section.kind === 'dlc' || room[section.kind] >= 0) continue
    return `${section.title}: this cluster takes ${slots[section.kind]} Guaranteed at most. Set the rest to Likely.`
  }
  return null
}

/** The worlds asteroid remixes may add to a cluster, e.g. `dlc2::worlds/MixingCeresAsteroid`. */
export function remixWorlds(cluster: SeedCluster, levels: MixingLevels): string[] {
  return mixingSettings.flatMap((setting) =>
    setting.kind === 'world' &&
    setting.world &&
    (levels[setting.id] ?? 0) > 0 &&
    mixingAvailable(setting, cluster, levels)
      ? [setting.world]
      : [],
  )
}
