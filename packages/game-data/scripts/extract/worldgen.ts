import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { clean } from './collect.ts'

export interface WorldgenWorld {
  /** The path the generator reports, e.g. `expansion1::worlds/TerraMoonlet`. */
  path: string
  /** The last segment of the path, which is what a seed result calls the asteroid. */
  id: string
  name: string
}

export interface WorldgenSlot {
  world: string
  id: string
  /** The cluster's start asteroid (`startWorldIndex`). */
  start: boolean
}

export interface WorldgenCluster {
  layout: string
  prefix: string
  name: string
  requiredDlcIds: string[]
  forbiddenDlcIds: string[]
  menuOrder: number
  worlds: WorldgenSlot[]
}

export interface WorldgenTrait {
  /** Exactly as the generator reports it, e.g. `expansion1::traits/Volcanoes`. */
  id: string
  name: string
  desc?: string
}

export interface WorldgenCatalog {
  clusters: WorldgenCluster[]
  worlds: WorldgenWorld[]
  traits: WorldgenTrait[]
}

/** The base game's folder and one per DLC (`dlc/<name>/worldgen`), keyed by id prefix. */
function roots(dir: string): { prefix: string; path: string }[] {
  const found = [{ prefix: '', path: join(dir, 'StreamingAssets/worldgen') }]
  const dlcDir = join(dir, 'StreamingAssets/dlc')
  if (existsSync(dlcDir)) {
    for (const name of readdirSync(dlcDir).sort()) {
      found.push({ prefix: `${name}::`, path: join(dlcDir, name, 'worldgen') })
    }
  }
  return found.filter((root) => existsSync(root.path))
}

/** Top-level `key: value` scalars of a worldgen YAML; nested blocks are not needed. */
function topLevel(text: string): Map<string, string> {
  const values = new Map<string, string>()
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Za-z]+):\s*(.*?)\s*(?:#.*)?$/.exec(line)
    if (match && match[2]) values.set(match[1]!, match[2])
  }
  return values
}

/** The `- world:` entries of `worldPlacements`, in file order. */
function placements(text: string): string[] {
  const worlds: string[] = []
  let inside = false
  for (const line of text.split(/\r?\n/)) {
    if (/^worldPlacements:/.test(line)) inside = true
    else if (/^[A-Za-z]/.test(line)) inside = false
    const match = inside ? /^\s*-\s*world:\s*(\S+)/.exec(line) : null
    if (match) worlds.push(match[1]!)
  }
  return worlds
}

const list = (value?: string): string[] =>
  value
    ? value
        .replace(/[[\]]/g, '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []

const yamlFiles = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((file) => file.endsWith('.yaml'))
        .sort()
    : []

/** Clusters, worlds and world traits from the game's worldgen YAMLs, named from the strings. */
export function readWorldgen(dir: string, strings: Map<string, string>): WorldgenCatalog {
  const text = (key: string | undefined, fallback: string) =>
    clean(strings.get(key ?? '') ?? fallback)
  const catalog: WorldgenCatalog = { clusters: [], worlds: [], traits: [] }
  for (const root of roots(dir)) {
    for (const file of yamlFiles(join(root.path, 'worlds'))) {
      const id = file.replace(/\.yaml$/, '')
      const fields = topLevel(readFileSync(join(root.path, 'worlds', file), 'utf8'))
      catalog.worlds.push({
        path: `${root.prefix}worlds/${id}`,
        id,
        name: text(fields.get('name'), id),
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
        requiredDlcIds: list(fields.get('requiredDlcIds')),
        forbiddenDlcIds: list(fields.get('forbiddenDlcIds')),
        menuOrder: Number(fields.get('menuOrder') ?? 0),
        worlds: placements(body).map((world, index) => ({
          world,
          id: world.slice(world.lastIndexOf('/') + 1),
          start: index === start,
        })),
      })
    }
  }
  catalog.clusters.sort((a, b) => a.menuOrder - b.menuOrder || a.prefix.localeCompare(b.prefix))
  return catalog
}
