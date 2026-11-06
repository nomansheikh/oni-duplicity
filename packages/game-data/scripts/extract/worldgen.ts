import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { clean } from './collect.ts'
import type { DlcEntry } from './dlcs.ts'
import type { MixingSection, MixingSetting } from './mixing.ts'
import { countEntries, inlineList, listField, topLevel, yamlFiles } from './yaml.ts'

export interface WorldgenWorld {
  /** The path the generator reports, e.g. `expansion1::worlds/TerraMoonlet`. */
  path: string
  /** The last segment of the path, which is what a seed result calls the asteroid. */
  id: string
  name: string
  /** How many `subworldMixingRules` the world has: the biome remix slots it offers. */
  subworldMixingSlots: number
}

export interface WorldgenSlot {
  world: string
  id: string
  /** The cluster's start asteroid (`startWorldIndex`). */
  start: boolean
  /** The placement has a `worldMixing` block, so an asteroid remix can replace it. */
  mixing: boolean
}

export interface WorldgenCluster {
  layout: string
  prefix: string
  name: string
  requiredDlcIds: string[]
  forbiddenDlcIds: string[]
  /** `clusterTags`; mixing settings forbid some of them. */
  tags: string[]
  menuOrder: number
  worlds: WorldgenSlot[]
}

export interface WorldgenTrait {
  /** Exactly as the generator reports it, e.g. `expansion1::traits/Volcanoes`. */
  id: string
  name: string
  desc?: string
  /** The DLC whose worldgen folder holds the trait; empty for the base game's. */
  requiredDlcIds: string[]
}

export interface WorldgenCatalog {
  clusters: WorldgenCluster[]
  worlds: WorldgenWorld[]
  traits: WorldgenTrait[]
  /** The base game's name, for content that needs no DLC. */
  baseGame: string
  dlcs: DlcEntry[]
  /** Mixing settings in mixing-code order. */
  mixing: MixingSetting[]
  mixingSections: MixingSection[]
}

/** The base game's folder and one per DLC (`dlc/<name>/worldgen`), keyed by id prefix. */
function roots(dir: string): { prefix: string; folder: string; path: string }[] {
  const found = [{ prefix: '', folder: '', path: join(dir, 'StreamingAssets/worldgen') }]
  const dlcDir = join(dir, 'StreamingAssets/dlc')
  if (existsSync(dlcDir)) {
    for (const name of readdirSync(dlcDir).sort()) {
      found.push({ prefix: `${name}::`, folder: name, path: join(dlcDir, name, 'worldgen') })
    }
  }
  return found.filter((root) => existsSync(root.path))
}

/** The `- world:` entries of `worldPlacements`, in file order, with their `worldMixing` flag. */
function placements(text: string): { world: string; mixing: boolean }[] {
  const worlds: { world: string; mixing: boolean }[] = []
  let inside = false
  for (const line of text.split(/\r?\n/)) {
    if (/^worldPlacements:/.test(line)) inside = true
    else if (/^[A-Za-z]/.test(line)) inside = false
    if (!inside) continue
    const match = /^\s*-\s*world:\s*(\S+)/.exec(line)
    if (match) worlds.push({ world: match[1]!, mixing: false })
    else if (/^\s+worldMixing:/.test(line) && worlds.length > 0) worlds.at(-1)!.mixing = true
  }
  return worlds
}

/** Clusters, worlds and world traits from the game's worldgen YAMLs, named from the strings. */
export function readWorldgen(
  dir: string,
  strings: Map<string, string>,
  dlcs: DlcEntry[],
): Omit<WorldgenCatalog, 'baseGame' | 'dlcs' | 'mixing' | 'mixingSections'> {
  const text = (key: string | undefined, fallback: string) =>
    clean(strings.get(key ?? '') ?? fallback)
  const catalog: Omit<WorldgenCatalog, 'baseGame' | 'dlcs' | 'mixing' | 'mixingSections'> = {
    clusters: [],
    worlds: [],
    traits: [],
  }
  for (const root of roots(dir)) {
    const dlc = dlcs.find((entry) => entry.directory === root.folder)
    if (root.folder && !dlc) throw new Error(`No DLC for worldgen folder ${root.folder}`)
    for (const file of yamlFiles(join(root.path, 'worlds'))) {
      const id = file.replace(/\.yaml$/, '')
      const body = readFileSync(join(root.path, 'worlds', file), 'utf8')
      catalog.worlds.push({
        path: `${root.prefix}worlds/${id}`,
        id,
        name: text(topLevel(body).get('name'), id),
        subworldMixingSlots: countEntries(body, 'subworldMixingRules'),
      })
    }
    for (const file of yamlFiles(join(root.path, 'traits'))) {
      const id = file.replace(/\.yaml$/, '')
      const fields = topLevel(readFileSync(join(root.path, 'traits', file), 'utf8'))
      const desc = strings.get(fields.get('description') ?? '')
      catalog.traits.push({
        id: `${root.prefix}traits/${id}`,
        name: text(fields.get('name'), id),
        ...(desc ? { desc: clean(desc) } : {}),
        requiredDlcIds: dlc ? [dlc.id] : [],
      })
    }
    for (const file of yamlFiles(join(root.path, 'clusters'))) {
      const id = file.replace(/\.yaml$/, '')
      const body = readFileSync(join(root.path, 'clusters', file), 'utf8')
      const fields = topLevel(body)
      const prefix = fields.get('coordinatePrefix')
      if (!prefix) continue
      const start = Number(fields.get('startWorldIndex') ?? 0)
      catalog.clusters.push({
        layout: `${root.prefix}clusters/${id}`,
        prefix,
        name: text(fields.get('name'), id),
        requiredDlcIds: inlineList(fields.get('requiredDlcIds')),
        forbiddenDlcIds: inlineList(fields.get('forbiddenDlcIds')),
        tags: listField(body, 'clusterTags'),
        menuOrder: Number(fields.get('menuOrder') ?? 0),
        worlds: placements(body).map(({ world, mixing }, index) => ({
          world,
          id: world.slice(world.lastIndexOf('/') + 1),
          start: index === start,
          mixing,
        })),
      })
    }
  }
  catalog.clusters.sort((a, b) => a.menuOrder - b.menuOrder || a.prefix.localeCompare(b.prefix))
  return catalog
}
