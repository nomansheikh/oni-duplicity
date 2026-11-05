import data from './generated/game-data.json' with { type: 'json' }

export { MinionSkills, type MinionSkill } from './skills.ts'
export {
  geyserTypes,
  resample,
  unresample,
  type GeyserShape,
  type GeyserTypeEntry,
  type Range,
} from './geyser-types.ts'
export { stories, storyQuests, type StoryEntry, type StoryQuestEntry } from './stories.ts'
import { geyserTypes } from './geyser-types.ts'
import { extraTraits, traitIdFixes } from './trait-info.ts'

export {
  extraTraits,
  findTraitInfo,
  inertTraitIds,
  traitCategoryLabels,
  traitConflicts,
  traitInfo,
  traitUnavailable,
  type DuplicantModel,
  type TraitCategory,
  type TraitConflict,
  type TraitInfo,
  type TraitUnavailable,
} from './trait-info.ts'

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

export interface CritterEntry extends GameEntry {
  family: string
  baby: boolean
}

export interface SettingEntry extends GameEntry {
  levels: GameEntry[]
}

export interface SkillGroupEntry extends GameEntry {
  /** Klei HashedString hash of the ID, as stored in MinionResume aptitudes. */
  hash: number
}

/** The extracted traits with wrong IDs fixed and the traits the extractor misses added. */
export const traits: GameEntry[] = [
  ...data.traits.map((t) => ({ ...t, id: traitIdFixes[t.id] ?? t.id })),
  ...extraTraits.filter((e) => !data.traits.some((t) => t.id === e.id)),
]
export const attributes: GameEntry[] = data.attributes
export const skillGroups: SkillGroupEntry[] = data.skillGroups
export const amounts: GameEntry[] = data.amounts
export const effects: GameEntry[] = data.effects
export const personalities: GameEntry[] = data.personalities
export const geysers: GameEntry[] = data.geysers
export const elements: ElementEntry[] = data.elements
export const critters: CritterEntry[] = data.critters
export const techs: GameEntry[] = data.techs
export const gameSettings: SettingEntry[] = data.gameSettings

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
/** Critter by prefab name, e.g. `PacuTropicalBaby`. */
export const findCritter = index(critters)
export const findTech = index(techs)
/** Setting by stored ID, ignoring case and underscores. */
export function findGameSetting(id: string): SettingEntry | undefined {
  const wanted = id.toUpperCase().replace(/_/g, '')
  return gameSettings.find((s) => s.id.toUpperCase().replace(/_/g, '') === wanted)
}

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

const geyserTypesByHash = new Map(geyserTypes.map((t) => [hashString(t.id), t]))
/** Geyser type by `configuration.typeId` hash. */
export const findGeyserTypeByHash = (hash: number) => geyserTypesByHash.get(hash)
