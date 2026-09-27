import data from './generated/game-data.json' with { type: 'json' }

export { MinionSkills, type MinionSkill } from './skills.ts'

export interface GameEntry {
  id: string
  name: string
  desc?: string
}

export interface ElementEntry extends GameEntry {
  /** SimHashes value as stored in PrimaryElement.ElementID. */
  hash: number
  state: string
  dlcId?: string
}

export interface SkillGroupEntry extends GameEntry {
  /** Klei HashedString hash of the ID, as stored in MinionResume aptitudes. */
  hash: number
}

export const traits: GameEntry[] = data.traits
export const attributes: GameEntry[] = data.attributes
export const skillGroups: SkillGroupEntry[] = data.skillGroups
export const amounts: GameEntry[] = data.amounts
export const effects: GameEntry[] = data.effects
export const personalities: GameEntry[] = data.personalities
export const geysers: GameEntry[] = data.geysers
export const elements: ElementEntry[] = data.elements

function index<T extends GameEntry>(list: T[]): (id: string) => T | undefined {
  const byUpper = new Map(list.map((e) => [e.id.toUpperCase(), e]))
  return (id) => byUpper.get(id.toUpperCase())
}

export const findTrait = index(traits)
export const findAttribute = index(attributes)
export const findAmount = index(amounts)
export const findEffect = index(effects)
export const findPersonality = index(personalities)
/** Geyser prefabs are `GeyserGeneric_<type>`. */
export const findGeyser = (prefab: string) => index(geysers)(prefab.replace(/^GeyserGeneric_/, ''))

const groupsByHash = new Map(skillGroups.map((g) => [g.hash, g]))
export const findSkillGroupByHash = (hash: number) => groupsByHash.get(hash)

const elementsByHash = new Map(elements.map((e) => [e.hash, e]))
export const findElementByHash = (hash: number) => elementsByHash.get(hash)
export const findElement = index(elements)

/** Klei's HashedString hash (SDBM over the lower-cased string). */
export function hashString(value: string): number {
  let h = 0
  for (const ch of value.toLowerCase()) h = (ch.charCodeAt(0) + (h << 6) + (h << 16) - h) | 0
  return h
}

/** `BingeEater` → `Binge Eater`, `Mining1` → `Mining 1`; fallback when the game has no string. */
export function humanize(id: string): string {
  return id
    .replace(/^GeyserGeneric_/, '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
