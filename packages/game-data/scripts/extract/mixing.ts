import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { clean } from './collect.ts'
import { dlcArrays } from './dlcs.ts'
import { listField, topLevel } from './yaml.ts'

export type MixingKind = 'dlc' | 'world' | 'subworld'

export interface MixingLevel {
  /** The level id the game stores, e.g. `GuranteeMixing` (sic). */
  id: string
  name: string
  desc?: string
  /** What the level adds to the coordinate's mixing code. */
  value: number
}

/** A section of the new-game Mixing tab: its header and the tooltip on it. */
export interface MixingSection {
  kind: MixingKind
  title: string
  desc: string
}

export interface MixingSetting {
  /** `DLC2_ID` for a DLC toggle, `CeresAsteroidMixing` for an asteroid remix, ... */
  id: string
  kind: MixingKind
  name: string
  desc?: string
  /** DLCs that must be in play (the toggle on, or the cluster needing it) for the setting. */
  requiredDlcIds: string[]
  /** The setting's radix in the mixing code (`coordinate_range`). */
  range: number
  levels: MixingLevel[]
  /** A cluster with any of these tags cannot use the setting. */
  forbiddenClusterTags: string[]
  /** Asteroid remix only: the world it swaps in, e.g. `dlc2::worlds/MixingCeresAsteroid`. */
  world?: string
}

/** The config class that defines each kind's levels. */
const CLASS_FILE: Record<MixingKind, string> = {
  dlc: 'DlcMixingSettingConfig.cs',
  world: 'WorldMixingSettingConfig.cs',
  subworld: 'SubworldMixingSettingConfig.cs',
}
const KINDS: Record<string, MixingKind> = { Dlc: 'dlc', World: 'world', Subworld: 'subworld' }

function stringOf(strings: Map<string, string>, key: string): string {
  const value = strings.get(key)
  if (!value) throw new Error(`No string ${key}`)
  return clean(value)
}

const optional = (strings: Map<string, string>, key: string | undefined) => {
  const value = key ? strings.get(key) : undefined
  return value ? { desc: clean(value) } : {}
}

/** The section headers and their tooltips, as `MixingContentPanel` sets them. */
export function readMixingSections(strings: Map<string, string>): MixingSection[] {
  const screen = 'STRINGS.UI.FRONTEND.COLONYDESTINATIONSCREEN'
  const keys: [MixingKind, string, string][] = [
    ['dlc', 'MIXING_DLC_HEADER', 'MIXING_TOOLTIP_DLC_MIXING'],
    ['world', 'MIXING_WORLDMIXING_HEADER', 'MIXING_TOOLTIP_ASTEROID_MIXING'],
    ['subworld', 'MIXING_SUBWORLDMIXING_HEADER', 'MIXING_TOOLTIP_BIOME_MIXING'],
  ]
  return keys.map(([kind, header, tooltip]) => ({
    kind,
    title: stringOf(strings, `${screen}.${header}`),
    desc: stringOf(strings, `${screen}.${tooltip}`),
  }))
}

/** `new SettingLevel("Disabled", UI....NAME, <tooltip>, 0L, null)` calls in a config class. */
function readLevels(path: string, strings: Map<string, string>): MixingLevel[] {
  const levelCall = /new SettingLevel\("(\w+)", (UI\.[\w.]+\.NAME), .*?, (\d+)L, null\)/g
  return [...readFileSync(path, 'utf8').matchAll(levelCall)].map(([, id, key, value]) => ({
    id: id!,
    name: stringOf(strings, `STRINGS.${key}`),
    ...optional(strings, `STRINGS.${key!.replace(/NAME$/, 'TOOLTIP')}`),
    value: Number(value),
  }))
}

/** A worldgen path such as `dlc2::worldMixing/CeresMixingSettings` to its YAML file. */
function yamlPath(dataDir: string, path: string): string {
  const [dlc, rest] = path.includes('::') ? path.split('::') : ['', path]
  const root = dlc
    ? join(dataDir, 'StreamingAssets/dlc', dlc, 'worldgen')
    : join(dataDir, 'StreamingAssets/worldgen')
  return join(root, `${rest}.yaml`)
}

/**
 * The mixing settings in the order `CustomGameSettings` registers them, which is the order the
 * mixing code packs them in (`GetMixingSettingsCode`). Ids, ranges and required DLCs come from
 * `CustomMixingSettingsConfigs`, levels from the config classes, names and forbidden cluster tags
 * from the settings' YAMLs and the strings.
 */
export function readMixing(
  decompDir: string,
  dataDir: string,
  strings: Map<string, string>,
): MixingSetting[] {
  const dir = join(decompDir, 'Assembly-CSharp')
  const settingsDir = join(dir, 'Klei/CustomSettings')
  const order = [
    ...readFileSync(join(dir, 'CustomGameSettings.cs'), 'utf8').matchAll(
      /\w+\(CustomMixingSettingsConfigs\.(\w+)\);/g,
    ),
  ].map((m) => m[1]!)
  const configs = new Map<string, { kind: MixingKind; args: string[] }>()
  const source = readFileSync(join(settingsDir, 'CustomMixingSettingsConfigs.cs'), 'utf8')
  for (const [, field, kind, args] of source.matchAll(
    /public static SettingConfig (\w+) = new (Dlc|World|Subworld)MixingSettingConfig\(([^;]*)\);/g,
  )) {
    configs.set(field!, { kind: KINDS[kind!]!, args: args!.split(', ').map((a) => a.trim()) })
  }
  const arrays = dlcArrays(decompDir)
  const levelsOf = (kind: MixingKind) => readLevels(join(settingsDir, CLASS_FILE[kind]), strings)
  const unquote = (arg: string) => JSON.parse(arg) as string
  const required = (arg: string) => {
    const ids = arrays.get(arg)
    if (!ids) throw new Error(`Unknown required content ${arg}`)
    return ids
  }

  return order.map((field): MixingSetting => {
    const config = configs.get(field)
    if (!config) throw new Error(`No mixing config ${field}`)
    const { kind, args } = config
    if (kind === 'dlc') {
      // (id, label, tooltip, coordinate_range, triggers_custom_game, required_content, dlcIdFrom, …)
      return {
        id: unquote(args[0]!),
        kind,
        name: stringOf(strings, `STRINGS.${args[1]}`),
        ...optional(strings, `STRINGS.${args[2]}`),
        requiredDlcIds: required(args[5]!),
        range: Number.parseInt(args[3]!, 10),
        levels: levelsOf(kind),
        forbiddenClusterTags: [],
      }
    }
    // (id, worldgenPath, required_content, dlcIdFrom, triggers_custom_game, coordinate_range)
    const yaml = readFileSync(yamlPath(dataDir, unquote(args[1]!)), 'utf8')
    const fields = topLevel(yaml)
    const world = kind === 'world' ? fields.get('world') : undefined
    return {
      id: unquote(args[0]!),
      kind,
      name: stringOf(strings, fields.get('name') ?? ''),
      ...optional(strings, fields.get('description')),
      requiredDlcIds: required(args[2]!),
      range: Number.parseInt(args[5]!, 10),
      levels: levelsOf(kind),
      forbiddenClusterTags: listField(yaml, 'forbiddenClusterTags'),
      ...(world ? { world } : {}),
    }
  })
}
