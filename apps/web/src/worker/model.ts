import { rawCanAdd, rawDefaultItem } from './raw.ts'
import {
  MinionSkills,
  effects as effectCatalog,
  findAmount,
  findCritter,
  findGameSetting,
  findTech,
  techs as techCatalog,
  elements as elementCatalog,
  findAttribute,
  findElementByHash,
  findEffect,
  findGeyser,
  findGeyserTypeByHash,
  findPersonality,
  findTrait,
  hashString,
  stories as storyCatalog,
  storyQuests,
  humanize,
  resample,
  skillGroups,
  traits as traitCatalog,
  unresample,
  type GeyserTypeEntry,
  type Range,
} from '@oni-duplicity/game-data'
import {
  MAX_VERIFIED_MINOR,
  type Behavior,
  type GameObject,
  type ModifiersExtraData,
  type SaveGame,
  type StoredItem,
  type TemplateData,
} from '@oni-duplicity/save-parser'
import {
  applySpaceEdit,
  destinationState,
  type DestinationState,
  type SpaceEdit,
} from './space-edits.ts'

// --- View models (sent to the UI) -----------------------------------------

export interface Named {
  id: string
  name: string
  desc?: string
}

export interface Summary {
  fileName: string
  baseName: string
  cycles: number
  duplicants: number
  version: string
  buildVersion: number
  dlcIds: string[]
  clusterId: string
  isAutoSave: boolean
  /** The save this was written from (`gameInfo.originalSaveName`); autosaves are named after it. */
  originalSaveName: string
  sandbox: boolean
  /** Set for good once debug tools are used; blocks achievements. */
  debugWasUsed: boolean
  unverified: boolean
  warnings: string[]
}

export interface InterestView extends Named {
  hash: number
  active: boolean
}

export interface AttributeView extends Named {
  level: number
}

export interface SkillView extends Named {
  group: string
  mastered: boolean
}

export interface AmountView extends Named {
  value: number
}

export interface EffectView extends Named {
  cyclesRemaining: number
}

export interface MaterialView {
  id: string
  name: string
  state: string
  looseMass: number
  storedMass: number
  looseCount: number
  storedCount: number
  /** Mass-weighted average temperature in Kelvin. */
  temperature: number
}

export interface MaterialItemView {
  ref: string
  where: string
  loose: boolean
  x: number
  y: number
  mass: number
  temperature: number
  /** Loose items a move order points at; deleting one would leave a dangling reference. */
  protected: boolean
  /** KPrefabID instance ID of a loose chunk, which is what delete edits are addressed by. */
  instanceId: number | null
}

export interface CritterView {
  id: string
  prefab: string
  name: string
  family: string
  baby: boolean
  x: number
  y: number
  amounts: AmountView[]
}

export interface TechView extends Named {
  complete: boolean
}

export interface GameSettingView extends Named {
  current: string
  levels: Named[]
  /** False when the stored value isn't a level we know, so we don't risk writing a bad ID. */
  editable: boolean
}

export interface WorldView {
  id: string
  name: string
  worldType: string
  width: number
  height: number
  discovered: boolean
  startWorld: boolean
  visited: boolean
}

export interface DestinationView extends DestinationState {
  id: number
  type: string
  distance: number
  resources: { name: string; amount: number }[]
}

/** `StoryInstance.State`; RETROFITTED (-1) is added by the game to saves that predate a story. */
export type StoryState =
  | 'retrofitted'
  | 'notStarted'
  | 'discovered'
  | 'inProgress'
  | 'complete'
  /** A state value this version of the editor does not know. */
  | 'unknown'

export interface StoryQuestView {
  id: string
  name: string
  goal: string
  /** `Quest.State`. */
  state: 'notStarted' | 'inProgress' | 'completed' | 'unknown'
}

export interface StoryView {
  id: string
  name: string
  state: StoryState
  /** The asteroid the story was created on, if it can be found. */
  world: string | undefined
  /** Cycle each state was first reached; absent if never. */
  cycles: { discovered?: number; inProgress?: number; completed?: number; retrofitted?: number }
  quests: StoryQuestView[]
  /** Decoded building flags that show progress, e.g. the Activatable of a Gravitas machine. */
  activated: boolean | undefined
}

export type RawKind =
  | 'object'
  | 'array'
  | 'bytes'
  | 'string'
  | 'number'
  | 'boolean'
  | 'bigint'
  | 'null'

export type RawPath = (string | number)[]

export interface RawEntry {
  key: string | number
  /** Friendlier label, e.g. a group's prefab or a behavior's name. */
  label?: string
  path: RawPath
  kind: RawKind
  /** Children count for objects, arrays and byte arrays. */
  size?: number
  /** Arrays only: whether "add item" can build a valid new element (see `rawDefaultItem`). */
  canAdd?: boolean
  value?: string | number | boolean | null
}

export interface RawChildren {
  entries: RawEntry[]
  total: number
  /** Set when the node is an array that accepts a new item. */
  canAdd?: boolean
}

export type AccessorySlot = 'hair' | 'headshape' | 'eyes' | 'mouth' | 'torso' | 'skin'

export interface AccessorySlotView {
  slot: AccessorySlot
  label: string
  current: string
  options: string[]
}

export interface DuplicantView {
  id: string
  prefab: string
  isBionic: boolean
  name: string
  gender: string
  personality: Named
  hat: string | null
  traits: Named[]
  interests: InterestView[]
  attributes: AttributeView[]
  skills: SkillView[]
  experience: number
  amounts: AmountView[]
  effects: EffectView[]
  appearance: AccessorySlotView[]
}

export interface Catalogs {
  traits: Named[]
  effects: Named[]
}

export interface GeyserView {
  id: string
  prefab: string
  typeName: string
  typeDesc?: string
  name: string
  x: number
  y: number
  /** Kilograms emitted per cycle while active (`scaledRate`). */
  massPerCycle: number
  /** Seconds per eruption cycle, and the share of it spent erupting. */
  iterationSeconds: number
  iterationPercent: number
  /** Seconds per activity cycle, and the share of it spent active. */
  yearSeconds: number
  yearPercent: number
  /** The type's natural range per field; missing for types the editor doesn't know. */
  ranges?: Record<GeyserField, Range>
  /**
   * False when the saved values aren't what the rolls give (changed by a mod or another
   * editor). The game recomputes them from the rolls when it loads the save.
   */
  matchesRolls: boolean
}

/**
 * The game saves both the rolls and the values they give (`scaled*`), but recomputes the values
 * from the rolls when it loads a save. An edit therefore sets the roll and writes the matching
 * value, which keeps the save consistent whichever of the two the game reads.
 */
export type GeyserField =
  | 'scaledRate'
  | 'scaledIterationLength'
  | 'scaledIterationPercent'
  | 'scaledYearLength'
  | 'scaledYearPercent'

const GEYSER_FIELDS: Record<
  GeyserField,
  { roll: string; range: keyof Omit<GeyserTypeEntry, 'id'> }
> = {
  scaledRate: { roll: 'rateRoll', range: 'rate' },
  scaledIterationLength: { roll: 'iterationLengthRoll', range: 'iterationLength' },
  scaledIterationPercent: { roll: 'iterationPercentRoll', range: 'iterationPercent' },
  scaledYearLength: { roll: 'yearLengthRoll', range: 'yearLength' },
  scaledYearPercent: { roll: 'yearPercentRoll', range: 'yearPercent' },
}

type GeyserConfig = Record<string, number> & { typeId?: { hash: number } }

function geyserType(config: GeyserConfig): GeyserTypeEntry | undefined {
  const hash = config.typeId?.hash
  return hash === undefined ? undefined : findGeyserTypeByHash(hash)
}

/** The game computes in single precision; allow for that when comparing. */
function rollsMatch(config: GeyserConfig, type: GeyserTypeEntry): boolean {
  return Object.entries(GEYSER_FIELDS).every(([field, { roll, range }]) => {
    const expected = resample(config[roll] ?? 0, type[range])
    return Math.abs((config[field] ?? 0) - expected) <= Math.abs(expected) * 1e-5
  })
}

/** A portable copy of a duplicant's editable state (copy/paste and JSON export). */
export interface DuplicantProfile {
  format: 'duplicity-duplicant@1'
  name: string
  gender: string
  traits: string[]
  interests: string[]
  attributes: Record<string, number>
  skills: string[]
  experience: number
  appearance: Partial<Record<AccessorySlot, string>>
}

export type ProfileSection =
  | 'name'
  | 'traits'
  | 'interests'
  | 'attributes'
  | 'skills'
  | 'appearance'

export type Edit =
  | { type: 'setColonyName'; name: string }
  | { type: 'setSandbox'; enabled: boolean }
  | { type: 'setDuplicantName'; id: string; name: string }
  | { type: 'setGender'; id: string; gender: string }
  | { type: 'addTrait'; id: string; traitId: string }
  | { type: 'removeTrait'; id: string; traitId: string }
  | { type: 'setInterest'; id: string; hash: number; active: boolean }
  | { type: 'setAttributeLevel'; id: string; attributeId: string; level: number }
  | { type: 'setSkillMastered'; id: string; skillId: string; mastered: boolean }
  | { type: 'setExperience'; id: string; experience: number }
  | { type: 'setAmount'; id: string; amountId: string; value: number }
  | { type: 'addEffect'; id: string; effectId: string; cycles: number }
  | { type: 'setEffectCycles'; id: string; effectId: string; cycles: number }
  | { type: 'removeEffect'; id: string; effectId: string }
  | { type: 'setAccessory'; id: string; slot: AccessorySlot; number: string }
  | { type: 'applyProfile'; id: string; profile: DuplicantProfile; sections: ProfileSection[] }
  | { type: 'setDebugWasUsed'; used: boolean }
  | { type: 'bulkDuplicants'; action: 'relieveStress' | 'fillNeeds' | 'masterSkills' }
  | { type: 'bulkDuplicants'; action: 'setAttributes'; level: number }
  | { type: 'setGeyserName'; id: string; name: string }
  | { type: 'setGeyserValue'; id: string; field: GeyserField; value: number }
  | { type: 'setItemMass'; ref: string; mass: number }
  | { type: 'setItemTemperature'; ref: string; kelvin: number }
  | { type: 'deleteObject'; id: string }
  | { type: 'deleteDebris'; ids: number[] }
  | { type: 'cloneObject'; id: string }
  | { type: 'setTechResearched'; techId: string; complete: boolean }
  | { type: 'researchAll' }
  | { type: 'setGameSetting'; settingId: string; level: string }
  | { type: 'setAsteroidName'; id: string; name: string }
  | { type: 'setWorldDiscovered'; id: string; discovered: boolean }
  | { type: 'rawSet'; path: RawPath; value: string | number | boolean | null }
  | { type: 'rawRemove'; path: RawPath }
  | { type: 'rawDuplicate'; path: RawPath }
  | { type: 'rawAdd'; path: RawPath }
  | { type: 'setMaterialTemperature'; elementId: string; kelvin: number }
  | { type: 'scaleMaterialMass'; elementId: string; factor: number }
  | SpaceEdit

// --- Helpers ---------------------------------------------------------------

const SECONDS_PER_CYCLE = 600

/** Full values for a standard duplicant; bladder and stress are best empty. */
const FULL_NEEDS: Record<string, number> = {
  HitPoints: 100,
  Calories: 4_000_000,
  Stamina: 100,
  Breath: 100,
  Bladder: 0,
  Stress: 0,
}
const ACCESSORY_PREFIX = 'Root.Accessories.'

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}

const pad = (n: number) => String(n).padStart(3, '0')

/** Accessory numbers seen in real saves (7.33–7.38); offering others could reference art that doesn't exist. */
const KNOWN_ACCESSORIES: Record<AccessorySlot, number[]> = {
  hair: [...range(1, 33), 36, 37, 38, 43, 44, 45, 52],
  headshape: range(1, 5),
  eyes: range(1, 6),
  mouth: [...range(1, 5), 8],
  torso: range(1, 4),
  skin: range(1, 5),
}

const SLOT_LABELS: Record<AccessorySlot, string> = {
  hair: 'Hair',
  headshape: 'Head shape',
  eyes: 'Eyes',
  mouth: 'Mouth',
  torso: 'Shirt',
  skin: 'Skin tone',
}

/** Accessory types that follow each slot's number (e.g. the hat version of a hairstyle). */
const SLOT_TYPES: Record<AccessorySlot, string[]> = {
  hair: ['hair', 'hat_hair'],
  headshape: ['headshape'],
  eyes: ['eyes'],
  mouth: ['mouth'],
  torso: ['torso', 'arm_sleeve', 'arm_lower_sleeve'],
  skin: ['arm_lower', 'arm_upper', 'leg_skin'],
}

function behavior(obj: GameObject, name: string): Behavior | undefined {
  return obj.behaviors.find((b) => b.name === name)
}

function data(obj: GameObject, name: string): TemplateData {
  const found = behavior(obj, name)?.templateData
  if (!found) throw new Error(`Object has no decoded "${name}" behavior`)
  return found
}

/** Objects are addressed as `<prefab>:<index>`, stable for the lifetime of a loaded save. */
function objectsWith(
  save: SaveGame,
  behaviorName: string,
): { id: string; prefab: string; obj: GameObject }[] {
  const result: { id: string; prefab: string; obj: GameObject }[] = []
  for (const group of save.gameObjects) {
    group.gameObjects.forEach((obj, index) => {
      if (behavior(obj, behaviorName)?.templateData) {
        result.push({ id: `${group.name}:${index}`, prefab: group.name, obj })
      }
    })
  }
  return result
}

export function objectById(save: SaveGame, id: string): GameObject {
  const split = id.lastIndexOf(':')
  const group = save.gameObjects.find((g) => g.name === id.slice(0, split))
  const obj = group?.gameObjects[Number(id.slice(split + 1))]
  if (!obj) throw new Error(`No object ${id}`)
  return obj
}

export function saveGameObject(save: SaveGame): GameObject | undefined {
  return save.gameObjects.find((g) => g.name === 'SaveGame')?.gameObjects[0]
}

function dlcIds(save: SaveGame): string[] {
  const info = save.header.gameInfo
  if (Array.isArray(info.dlcIds)) return info.dlcIds.filter((id) => id !== '')
  return info.dlcId ? [info.dlcId] : []
}

function named(id: string, entry: { name: string; desc?: string } | undefined): Named {
  return entry
    ? { id, name: entry.name, ...(entry.desc ? { desc: entry.desc } : {}) }
    : { id, name: humanize(id) }
}

/** Personality descriptions refer to the duplicant as `{0}`. */
function withName(entry: Named, name: unknown): Named {
  if (!entry.desc || typeof name !== 'string') return entry
  return { ...entry, desc: entry.desc.replace(/\{0\}/g, name) }
}

function modifiers(obj: GameObject): ModifiersExtraData | undefined {
  const b = behavior(obj, 'MinionModifiers') ?? behavior(obj, 'Klei.AI.Modifiers')
  return b?.extraData as ModifiersExtraData | undefined
}

/** `Mining3` → `Mining`; the skill tree groups skills by this prefix. */
function skillGroupOf(skillId: string): string {
  return skillId.replace(/\d+$/, '')
}

// --- Views -----------------------------------------------------------------

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

function accessoryNumbers(obj: GameObject): Map<string, string> {
  const list = (behavior(obj, 'Accessorizer')?.templateData?.accessories ?? []) as {
    guid: { Guid: string }
  }[]
  const numbers = new Map<string, string>()
  for (const entry of list) {
    const match = /^(.+)_(\d{3})$/.exec(entry.guid.Guid.replace(ACCESSORY_PREFIX, ''))
    if (match) numbers.set(match[1]!, match[2]!)
  }
  return numbers
}

function appearanceOf(obj: GameObject): AccessorySlotView[] {
  const numbers = accessoryNumbers(obj)
  const slots: AccessorySlotView[] = []
  for (const slot of Object.keys(SLOT_TYPES) as AccessorySlot[]) {
    const current = numbers.get(SLOT_TYPES[slot][0]!)
    if (!current) continue
    const options = new Set(KNOWN_ACCESSORIES[slot].map(pad))
    options.add(current)
    slots.push({ slot, label: SLOT_LABELS[slot], current, options: [...options].sort() })
  }
  return slots
}

export function listDuplicants(save: SaveGame): DuplicantView[] {
  const activeDlcs = new Set(dlcIds(save))
  return objectsWith(save, 'MinionIdentity').map(({ id, prefab, obj }) => {
    const identity = data(obj, 'MinionIdentity')
    const resume = behavior(obj, 'MinionResume')?.templateData
    const traitIds = (behavior(obj, 'Klei.AI.Traits')?.templateData?.TraitIds ?? []) as string[]
    const levels = (behavior(obj, 'Klei.AI.AttributeLevels')?.templateData?.saveLoadLevels ??
      []) as {
      attributeId: string
      level: number
    }[]
    const mastery = new Map((resume?.MasteryBySkillID ?? []) as [string, boolean][])
    const aptitudes = new Map(
      ((resume?.AptitudeBySkillGroup ?? []) as [{ hash: number }, number][]).map(([k, v]) => [
        k.hash,
        v,
      ]),
    )
    const effectList = (behavior(obj, 'Klei.AI.Effects')?.templateData?.saveLoadEffects ?? []) as {
      id: string
      timeRemaining: number
    }[]
    const model = (identity.model as { name?: string } | undefined)?.name ?? prefab
    const personalityKey = typeof identity.nameStringKey === 'string' ? identity.nameStringKey : ''

    const skills: SkillView[] = MinionSkills.filter(
      (s) => (s.model ?? 'Minion') === model && s.requiredDlcIds.every((d) => activeDlcs.has(d)),
    ).map((s) => ({
      ...named(s.id, undefined),
      group: skillGroupOf(s.id),
      mastered: mastery.get(s.id) === true,
    }))
    // Keep skills the save has that our list doesn't know, so nothing disappears.
    for (const [skillId, mastered] of mastery) {
      if (!skills.some((s) => s.id === skillId)) {
        skills.push({ ...named(skillId, undefined), group: skillGroupOf(skillId), mastered })
      }
    }

    return {
      id,
      prefab,
      isBionic: prefab === 'BionicMinion',
      name: typeof identity.name === 'string' ? identity.name : '',
      gender: typeof identity.gender === 'string' ? identity.gender : '',
      personality: withName(named(personalityKey, findPersonality(personalityKey)), identity.name),
      hat: typeof resume?.currentHat === 'string' ? resume.currentHat : null,
      traits: traitIds.map((t) => named(t, findTrait(t))),
      interests: skillGroups.map((g) => ({
        id: g.id,
        name: g.name,
        ...(g.desc ? { desc: g.desc } : {}),
        hash: g.hash,
        active: (aptitudes.get(g.hash) ?? 0) > 0,
      })),
      attributes: levels.map((l) => ({
        ...named(l.attributeId, findAttribute(l.attributeId)),
        level: l.level,
      })),
      skills,
      experience:
        typeof resume?.totalExperienceGained === 'number' ? resume.totalExperienceGained : 0,
      amounts: (modifiers(obj)?.amounts ?? []).map((a) => ({
        ...named(a.name, findAmount(a.name)),
        value: Number((a.value as { value: number }).value),
      })),
      effects: effectList.map((e) => ({
        ...named(e.id, findEffect(e.id)),
        cyclesRemaining: e.timeRemaining / SECONDS_PER_CYCLE,
      })),
      appearance: appearanceOf(obj),
    }
  })
}

export function catalogs(): Catalogs {
  const strip = (list: { id: string; name: string; desc?: string }[]) =>
    list.map((e) => ({ id: e.id, name: e.name, ...(e.desc ? { desc: e.desc } : {}) }))
  return { traits: strip(traitCatalog), effects: strip(effectCatalog) }
}

export function listGeysers(save: SaveGame): GeyserView[] {
  return objectsWith(save, 'Geyser').map(({ id, prefab, obj }) => {
    const config = data(obj, 'Geyser').configuration as GeyserConfig
    const name = behavior(obj, 'UserNameable')?.templateData?.savedName
    const type = findGeyser(prefab)
    const ranges = geyserType(config)
    return {
      id,
      prefab,
      typeName: type?.name ?? humanize(prefab),
      ...(type?.desc ? { typeDesc: type.desc } : {}),
      name: typeof name === 'string' ? name : (type?.name ?? prefab),
      x: Math.round(obj.position.x),
      y: Math.round(obj.position.y),
      massPerCycle: config.scaledRate ?? 0,
      iterationSeconds: config.scaledIterationLength ?? 0,
      iterationPercent: config.scaledIterationPercent ?? 0,
      yearSeconds: config.scaledYearLength ?? 0,
      yearPercent: config.scaledYearPercent ?? 0,
      ...(ranges
        ? {
            ranges: Object.fromEntries(
              Object.entries(GEYSER_FIELDS).map(([field, { range }]) => [field, ranges[range]]),
            ) as Record<GeyserField, Range>,
          }
        : {}),
      matchesRolls: ranges ? rollsMatch(config, ranges) : true,
    }
  })
}

// --- Edits -----------------------------------------------------------------

function resumeOf(obj: GameObject): TemplateData {
  return data(obj, 'MinionResume')
}

type SavedEffect = { id: string; timeRemaining: number; saved?: boolean }

function effectsOf(obj: GameObject): SavedEffect[] {
  const effects = data(obj, 'Klei.AI.Effects')
  effects.saveLoadEffects ??= []
  return effects.saveLoadEffects as SavedEffect[]
}

export function applyEdit(save: SaveGame, edit: Edit): void {
  switch (edit.type) {
    case 'setColonyName':
      save.header.gameInfo.baseName = edit.name
      return
    case 'setSandbox': {
      save.header.gameInfo.sandboxEnabled = edit.enabled
      const obj = saveGameObject(save)
      const saveGame = obj ? behavior(obj, 'SaveGame')?.templateData : undefined
      if (saveGame) saveGame.sandboxEnabled = edit.enabled
      setQualityLevel(save, 'SandboxMode', edit.enabled ? 'Enabled' : 'Disabled')
      return
    }
    case 'setGeyserName': {
      const nameable = behavior(objectById(save, edit.id), 'UserNameable')?.templateData
      if (!nameable) throw new Error('This geyser cannot be renamed')
      nameable.savedName = edit.name
      return
    }
    case 'setDebugWasUsed':
      if (!('debugWasUsed' in save.gameData)) throw new Error('This save has no debug flag')
      save.gameData.debugWasUsed = edit.used
      return
    case 'bulkDuplicants': {
      const activeDlcs = new Set(dlcIds(save))
      for (const { id, prefab, obj } of objectsWith(save, 'MinionIdentity')) {
        const present = new Set(modifiers(obj)?.amounts.map((a) => a.name) ?? [])
        const setAmount = (amountId: string, value: number) =>
          present.has(amountId) && applyEdit(save, { type: 'setAmount', id, amountId, value })
        if (edit.action === 'relieveStress') setAmount('Stress', 0)
        if (edit.action === 'fillNeeds') {
          for (const [amountId, value] of Object.entries(FULL_NEEDS)) setAmount(amountId, value)
        }
        if (edit.action === 'setAttributes') {
          const levels = (behavior(obj, 'Klei.AI.AttributeLevels')?.templateData?.saveLoadLevels ??
            []) as { attributeId: string }[]
          for (const { attributeId } of levels) {
            applyEdit(save, { type: 'setAttributeLevel', id, attributeId, level: edit.level })
          }
        }
        if (edit.action === 'masterSkills') {
          const model = (data(obj, 'MinionIdentity').model as { name?: string } | undefined)?.name
          for (const skill of MinionSkills) {
            if ((skill.model ?? 'Minion') !== (model ?? prefab)) continue
            if (!skill.requiredDlcIds.every((d) => activeDlcs.has(d))) continue
            applyEdit(save, { type: 'setSkillMastered', id, skillId: skill.id, mastered: true })
          }
        }
      }
      return
    }
    case 'setGeyserValue': {
      const config = data(objectById(save, edit.id), 'Geyser').configuration as
        | GeyserConfig
        | undefined
      const field = GEYSER_FIELDS[edit.field]
      if (!config || !field || !(edit.field in config) || !(field.roll in config)) {
        throw new Error('This geyser has no such setting')
      }
      const type = geyserType(config)
      if (!type) throw new Error('Unknown geyser type; only its name can be changed')
      if (!Number.isFinite(edit.value)) throw new Error('Use a number')
      // Values are stored as single-precision floats.
      const roll = Math.fround(unresample(edit.value, type[field.range]))
      config[field.roll] = roll
      config[edit.field] = Math.fround(resample(roll, type[field.range]))
      return
    }
    case 'setItemMass':
      primary(itemByRef(save, edit.ref)).Units = Math.max(0, edit.mass)
      return
    case 'setItemTemperature':
      primary(itemByRef(save, edit.ref))._Temperature = Math.max(0, edit.kelvin)
      return
    case 'deleteObject': {
      const { list, index } = locate(save, edit.id)
      assertNotMarkedForMove(list[index]!, markedForMoveIds(save), edit.id)
      list.splice(index, 1)
      return
    }
    case 'deleteDebris':
      deleteDebris(save, edit.ids)
      return
    case 'cloneObject': {
      const { list, index } = locate(save, edit.id)
      const copy = cloneValue(list[index]!)
      assignNewIds(save, copy)
      list.splice(index + 1, 0, copy)
      return
    }
    case 'setTechResearched':
      setTech(save, edit.techId, edit.complete)
      return
    case 'researchAll':
      for (const tech of techCatalog) setTech(save, tech.id, true)
      return
    case 'setGameSetting':
      setQualityLevel(save, edit.settingId, edit.level)
      return
    case 'rawSet': {
      const { parent, key } = rawParent(save, edit.path)
      const current = parent[key as never] as unknown
      parent[key as never] = coerce(current, edit.value) as never
      return
    }
    case 'rawRemove': {
      const { parent, key } = rawParent(save, edit.path)
      if (!Array.isArray(parent)) throw new Error('Only array items can be removed')
      parent.splice(Number(key), 1)
      return
    }
    case 'rawDuplicate': {
      const { parent, key } = rawParent(save, edit.path)
      if (!Array.isArray(parent)) throw new Error('Only array items can be duplicated')
      parent.splice(Number(key) + 1, 0, cloneValue(parent[Number(key)]))
      return
    }
    case 'rawAdd': {
      const item = rawDefaultItem(save, edit.path)
      if (!item) throw new Error('Items cannot be added to this array')
      ;(rawGet(save, edit.path) as unknown[]).push(item.value)
      return
    }
    case 'setMaterialTemperature':
      for (const item of materialItems(save, edit.elementId))
        primary(item.obj)._Temperature = edit.kelvin
      return
    case 'scaleMaterialMass':
      for (const item of materialItems(save, edit.elementId)) {
        const pe = primary(item.obj)
        pe.Units = Math.max(0, Number(pe.Units) * edit.factor)
      }
      return
    case 'setDestinationMass':
    case 'setDestinationAnalysis':
    case 'revealStarmap':
    case 'setPoiStock':
      applySpaceEdit(save, edit)
      return
    default:
      applyObjectEdit(objectById(save, edit.id), edit)
  }
}

function applyObjectEdit(obj: GameObject, edit: Edit): void {
  switch (edit.type) {
    case 'setDuplicantName':
      data(obj, 'MinionIdentity').name = edit.name
      return
    case 'setGender': {
      const identity = data(obj, 'MinionIdentity')
      identity.gender = edit.gender
      identity.genderStringKey = edit.gender
      return
    }
    case 'addTrait': {
      const traits = data(obj, 'Klei.AI.Traits')
      const ids = (traits.TraitIds as string[] | null) ?? []
      if (!ids.includes(edit.traitId)) traits.TraitIds = [...ids, edit.traitId]
      return
    }
    case 'removeTrait': {
      const traits = data(obj, 'Klei.AI.Traits')
      traits.TraitIds = ((traits.TraitIds as string[] | null) ?? []).filter(
        (t) => t !== edit.traitId,
      )
      return
    }
    case 'setInterest': {
      const resume = resumeOf(obj)
      const list = (
        (resume.AptitudeBySkillGroup as [{ hash: number }, number][] | null) ?? []
      ).filter(([k]) => k.hash !== edit.hash)
      if (edit.active) list.push([{ hash: edit.hash }, 1])
      resume.AptitudeBySkillGroup = list
      return
    }
    case 'setAttributeLevel': {
      const levels = data(obj, 'Klei.AI.AttributeLevels').saveLoadLevels as {
        attributeId: string
        level: number
      }[]
      const entry = levels.find((l) => l.attributeId === edit.attributeId)
      if (!entry) throw new Error(`No attribute ${edit.attributeId}`)
      entry.level = Math.max(0, Math.round(edit.level))
      return
    }
    case 'setSkillMastered': {
      const resume = resumeOf(obj)
      const list = ((resume.MasteryBySkillID as [string, boolean][] | null) ?? []).filter(
        ([s]) => s !== edit.skillId,
      )
      if (edit.mastered) list.push([edit.skillId, true])
      resume.MasteryBySkillID = list
      return
    }
    case 'setExperience':
      resumeOf(obj).totalExperienceGained = Math.max(0, edit.experience)
      return
    case 'setAmount': {
      const amount = modifiers(obj)?.amounts.find((a) => a.name === edit.amountId)
      if (!amount) throw new Error(`No amount ${edit.amountId}`)
      ;(amount.value as { value: number }).value = edit.value
      return
    }
    case 'addEffect': {
      const list = effectsOf(obj)
      if (!list.some((e) => e.id === edit.effectId)) {
        list.push({
          id: edit.effectId,
          timeRemaining: edit.cycles * SECONDS_PER_CYCLE,
          saved: true,
        })
      }
      return
    }
    case 'setEffectCycles': {
      const effect = effectsOf(obj).find((e) => e.id === edit.effectId)
      if (effect) effect.timeRemaining = Math.max(0, edit.cycles * SECONDS_PER_CYCLE)
      return
    }
    case 'removeEffect':
      data(obj, 'Klei.AI.Effects').saveLoadEffects = effectsOf(obj).filter(
        (e) => e.id !== edit.effectId,
      )
      return
    case 'setAccessory': {
      const list = data(obj, 'Accessorizer').accessories as { guid: { Guid: string } }[]
      for (const type of SLOT_TYPES[edit.slot]) {
        const pattern = new RegExp(`^${ACCESSORY_PREFIX}${type}_\\d{3}$`)
        const entry = list.find((a) => pattern.test(a.guid.Guid))
        if (entry) entry.guid.Guid = `${ACCESSORY_PREFIX}${type}_${edit.number}`
      }
      return
    }
    case 'setAsteroidName':
      data(obj, 'AsteroidGridEntity').m_name = edit.name
      return
    case 'setWorldDiscovered':
      data(obj, 'WorldContainer').isDiscovered = edit.discovered
      return
    case 'applyProfile':
      applyProfile(obj, edit.profile, new Set(edit.sections))
      return
    default:
      throw new Error(`Unhandled edit ${edit.type}`)
  }
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** An edit to one duplicant, without its `id` (the editor adds it). */
export type DuplicantEdit = DistributiveOmit<Extract<Edit, { id: string }>, 'id'>

function applyProfile(
  obj: GameObject,
  profile: DuplicantProfile,
  sections: Set<ProfileSection>,
): void {
  if (profile.format !== 'duplicity-duplicant@1')
    throw new Error('Not a Duplicity duplicant profile')
  const identity = data(obj, 'MinionIdentity')
  if (sections.has('name')) {
    identity.name = profile.name
    identity.gender = profile.gender
    identity.genderStringKey = profile.gender
  }
  if (sections.has('traits')) data(obj, 'Klei.AI.Traits').TraitIds = [...profile.traits]
  const resume = behavior(obj, 'MinionResume')?.templateData
  if (sections.has('interests') && resume) {
    const hashes = skillGroups.filter((g) => profile.interests.includes(g.id)).map((g) => g.hash)
    resume.AptitudeBySkillGroup = hashes.map((hash) => [{ hash }, 1])
  }
  if (sections.has('attributes')) {
    const levels = (data(obj, 'Klei.AI.AttributeLevels').saveLoadLevels ?? []) as {
      attributeId: string
      level: number
    }[]
    for (const entry of levels) {
      const level = profile.attributes[entry.attributeId]
      if (typeof level === 'number') entry.level = Math.max(0, Math.round(level))
    }
  }
  if (sections.has('skills') && resume) {
    resume.MasteryBySkillID = profile.skills.map((id) => [id, true])
    resume.totalExperienceGained = Math.max(0, profile.experience)
  }
  if (sections.has('appearance')) {
    for (const [slot, number] of Object.entries(profile.appearance)) {
      if (number)
        applyObjectEdit(obj, { type: 'setAccessory', id: '', slot: slot as AccessorySlot, number })
    }
  }
}

// --- Materials -------------------------------------------------------------------

const ELEMENT_IDS = new Set(elementCatalog.map((e) => e.id))

function splitId(id: string): { group: string; index: number } {
  const split = id.lastIndexOf(':')
  return { group: id.slice(0, split), index: Number(id.slice(split + 1)) }
}

function primary(obj: GameObject): TemplateData {
  return data(obj, 'PrimaryElement')
}

interface MaterialItem {
  ref: string
  obj: GameObject
  owner: GameObject
  where: string
  loose: boolean
}

/** A loose chunk: an object in a group named after an element, with its own mass. */
function isLooseChunk(groupName: string, obj: GameObject): boolean {
  return ELEMENT_IDS.has(groupName) && !!behavior(obj, 'PrimaryElement')?.templateData
}

/** Loose chunks (groups named after an element) and items held in storages. */
function allMaterialItems(save: SaveGame): MaterialItem[] {
  const items: MaterialItem[] = []
  for (const group of save.gameObjects) {
    group.gameObjects.forEach((obj, index) => {
      const id = `${group.name}:${index}`
      if (isLooseChunk(group.name, obj)) {
        items.push({ ref: id, obj, owner: obj, where: 'Loose', loose: true })
      }
      obj.behaviors.forEach((b, bIndex) => {
        if (b.name !== 'Storage' || !Array.isArray(b.extraData)) return
        ;(b.extraData as StoredItem[]).forEach((item, iIndex) => {
          if (ELEMENT_IDS.has(item.name) && behavior(item, 'PrimaryElement')?.templateData) {
            items.push({
              ref: `${id}/${bIndex}/${iIndex}`,
              obj: item,
              owner: obj,
              where: humanize(group.name),
              loose: false,
            })
          }
        })
      })
    })
  }
  return items
}

function elementOf(obj: GameObject): string | undefined {
  const hash = Number(behavior(obj, 'PrimaryElement')?.templateData?.ElementID)
  return findElementByHash(hash)?.id
}

function materialItems(save: SaveGame, elementId: string): MaterialItem[] {
  return allMaterialItems(save).filter((item) => elementOf(item.obj) === elementId)
}

export function itemByRef(save: SaveGame, ref: string): GameObject {
  const [ownerId, bIndex, iIndex] = ref.split('/')
  const owner = objectById(save, ownerId!)
  if (bIndex === undefined) return owner
  const stored = owner.behaviors[Number(bIndex)]?.extraData as StoredItem[] | undefined
  const item = stored?.[Number(iIndex)]
  if (!item) throw new Error(`No stored item ${ref}`)
  return item
}

/** The game objects an edit may change, for undo snapshots. */
export function touchedBy(save: SaveGame, edit: Edit): GameObject[] {
  if (edit.type === 'bulkDuplicants') {
    return objectsWith(save, 'MinionIdentity').map(({ obj }) => obj)
  }
  if ('id' in edit) return [objectById(save, edit.id)]
  if ('ref' in edit) return [objectById(save, edit.ref.split('/')[0]!)]
  if ('elementId' in edit)
    return [...new Set(materialItems(save, edit.elementId).map((i) => i.owner))]
  const saveGame = saveGameObject(save)
  return saveGame ? [saveGame] : []
}

export function listMaterials(save: SaveGame): MaterialView[] {
  const totals = new Map<string, MaterialView & { heat: number }>()
  for (const item of allMaterialItems(save)) {
    const pe = primary(item.obj)
    const element = findElementByHash(Number(pe.ElementID))
    if (!element) continue
    const mass = Number(pe.Units) || 0
    const entry = totals.get(element.id) ?? {
      id: element.id,
      name: element.name,
      state: element.state,
      looseMass: 0,
      storedMass: 0,
      looseCount: 0,
      storedCount: 0,
      temperature: 0,
      heat: 0,
    }
    if (item.loose) {
      entry.looseMass += mass
      entry.looseCount++
    } else {
      entry.storedMass += mass
      entry.storedCount++
    }
    entry.heat += mass * (Number(pe._Temperature) || 0)
    totals.set(element.id, entry)
  }
  return [...totals.values()]
    .map(({ heat, ...m }) => ({
      ...m,
      temperature: heat / Math.max(m.looseMass + m.storedMass, 1e-9),
    }))
    .sort((a, b) => b.looseMass + b.storedMass - (a.looseMass + a.storedMass))
}

export function listMaterialItems(save: SaveGame, elementId: string): MaterialItemView[] {
  const moving = markedForMoveIds(save)
  return materialItems(save, elementId).map((item) => {
    const pe = primary(item.obj)
    const position = item.loose ? item.obj.position : item.owner.position
    return {
      ref: item.ref,
      where: item.where,
      loose: item.loose,
      x: Math.round(position.x),
      y: Math.round(position.y),
      mass: Number(pe.Units) || 0,
      temperature: Number(pe._Temperature) || 0,
      protected: item.loose && isMarkedForMove(item.obj, moving),
      instanceId: item.loose ? (instanceId(item.obj) ?? null) : null,
    }
  })
}

// --- Deleting loose debris -------------------------------------------------------

const instanceId = (obj: GameObject): number | undefined =>
  behavior(obj, 'KPrefabID')?.templateData?.InstanceID as number | undefined

/**
 * KPrefabID instance IDs that a move order (the "Move here" tool) points at. Each order is a
 * MovePickupablePlacer whose CancellableMove behavior saves a list of `Ref<Movable>` IDs, and
 * the game's `CancellableMove.OnCancel` calls `ClearMove()` on whatever the ID resolves to
 * without a null check, so deleting an item that is still listed there can crash the game.
 */
function markedForMoveIds(save: SaveGame): Set<number> {
  const ids = new Set<number>()
  for (const group of save.gameObjects) {
    for (const obj of group.gameObjects) {
      const movables = behavior(obj, 'CancellableMove')?.templateData?.movables
      if (!Array.isArray(movables)) continue
      for (const ref of movables as { id?: unknown }[]) {
        if (typeof ref?.id === 'number') ids.add(ref.id)
      }
    }
  }
  return ids
}

function isMarkedForMove(obj: GameObject, moving: Set<number>): boolean {
  if (behavior(obj, 'Movable')?.templateData?.isMarkedForMove === true) return true
  const id = instanceId(obj)
  return id !== undefined && moving.has(id)
}

function assertNotMarkedForMove(obj: GameObject, moving: Set<number>, id: string): void {
  if (isMarkedForMove(obj, moving)) {
    throw new Error(`${id} is marked for a move order; cancel the move in game first`)
  }
}

/**
 * Removes loose element chunks by KPrefabID instance ID. Positions (`<element>:<index>`) shift
 * after every delete, so a click made on a list that has since changed could hit a different
 * chunk; instance IDs do not. Refuses unknown IDs and anything a move order points at, before
 * changing anything. Stored items, buildings and critters are never loose chunks, so they are
 * never found.
 */
function deleteDebris(save: SaveGame, ids: number[]): void {
  const wanted = new Set(ids)
  const found = new Map<number, { list: GameObject[]; index: number }>()
  const moving = markedForMoveIds(save)
  for (const group of save.gameObjects) {
    group.gameObjects.forEach((obj, index) => {
      if (!isLooseChunk(group.name, obj)) return
      const id = instanceId(obj)
      if (id === undefined || !wanted.has(id)) return
      if (found.has(id)) throw new Error(`Loose item ${id} is ambiguous`)
      assertNotMarkedForMove(obj, moving, `${group.name}:${index}`)
      found.set(id, { list: group.gameObjects, index })
    })
  }
  for (const id of wanted) {
    if (!found.has(id)) throw new Error(`Loose item ${id} no longer exists`)
  }
  const byList = new Map<GameObject[], number[]>()
  for (const { list, index } of found.values())
    byList.set(list, [...(byList.get(list) ?? []), index])
  for (const [list, indexes] of byList) {
    for (const index of indexes.sort((a, b) => b - a)) list.splice(index, 1)
  }
}

// --- Structural edits (clone / delete) and critters ----------------------------------

/**
 * Deep copy that keeps Uint8Array views small: a view copies only its own bytes, not the
 * (possibly 400 MB) buffer it points into, unlike structuredClone.
 */
export function cloneValue<T>(value: T): T {
  if (value instanceof Uint8Array) return value.slice() as T
  if (Array.isArray(value)) return value.map(cloneValue) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = cloneValue(v)
    return out as T
  }
  return value
}

function locate(save: SaveGame, id: string): { list: GameObject[]; index: number } {
  const { group, index } = splitId(id)
  const list = save.gameObjects.find((g) => g.name === group)?.gameObjects
  if (!list?.[index]) throw new Error(`No object ${id}`)
  return { list, index }
}

/** Give an object (and anything it stores) fresh KPrefabID instance IDs from Game+Settings. */
function assignNewIds(save: SaveGame, obj: GameObject): void {
  const kpid = behavior(obj, 'KPrefabID')?.templateData
  if (kpid) {
    const next = Number(save.settings.nextUniqueID)
    if (!Number.isFinite(next)) throw new Error('This save has no unique ID counter')
    kpid.InstanceID = next
    save.settings.nextUniqueID = next + 1
  }
  for (const b of obj.behaviors) {
    if (b.name === 'Storage' && Array.isArray(b.extraData)) {
      for (const item of b.extraData as StoredItem[]) assignNewIds(save, item)
    }
  }
}

export function listCritters(save: SaveGame): CritterView[] {
  return objectsWith(save, 'CreatureBrain').map(({ id, prefab, obj }) => {
    const entry = findCritter(prefab)
    return {
      id,
      prefab,
      name: entry?.name ?? humanize(prefab),
      family: entry ? humanize(entry.family.toLowerCase()) : humanize(prefab),
      baby: entry?.baby ?? prefab.endsWith('Baby'),
      x: Math.round(obj.position.x),
      y: Math.round(obj.position.y),
      amounts: (modifiers(obj)?.amounts ?? []).map((a) => ({
        ...named(a.name, findAmount(a.name)),
        value: Number((a.value as { value: number }).value),
      })),
    }
  })
}

// --- Research, game settings and space -----------------------------------------------

interface SavedTech {
  techId: string
  complete: boolean
  [key: string]: unknown
}

function researchData(save: SaveGame): { techs: SavedTech[] } | undefined {
  const obj = saveGameObject(save)
  const research = obj ? behavior(obj, 'Research')?.templateData : undefined
  return research?.saveData as { techs: SavedTech[] } | undefined
}

function setTech(save: SaveGame, techId: string, complete: boolean): void {
  const saveData = researchData(save)
  if (!saveData) throw new Error('This save has no research data')
  saveData.techs ??= []
  const existing = saveData.techs.find((t) => t.techId === techId)
  if (existing) {
    existing.complete = complete
    return
  }
  if (!complete) return
  // Copy the shape of an existing entry (inventory IDs differ between base game and DLC).
  const template = saveData.techs[0]
  const inventoryIDs = (template?.inventoryIDs as string[] | undefined) ?? [
    'basic',
    'advanced',
    'space',
  ]
  saveData.techs.push({
    techId,
    complete: true,
    inventoryIDs: [...inventoryIDs],
    inventoryValues: inventoryIDs.map(() => 0),
    ...(template && 'unlockedPOIIDs' in template ? { unlockedPOIIDs: [] } : {}),
  })
}

export function listTechs(save: SaveGame): TechView[] {
  const saved = new Map((researchData(save)?.techs ?? []).map((t) => [t.techId, t.complete]))
  const ids = new Set([...techCatalog.map((t) => t.id), ...saved.keys()])
  return [...ids]
    .map((id) => ({ ...named(id, findTech(id)), complete: saved.get(id) === true }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function qualityLevels(save: SaveGame): [string, string][] {
  const settings = save.gameData.customGameSettings as {
    CurrentQualityLevelsBySetting?: [string, string][]
  }
  return settings?.CurrentQualityLevelsBySetting ?? []
}

function setQualityLevel(save: SaveGame, settingId: string, level: string): void {
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

export function listWorlds(save: SaveGame): WorldView[] {
  return objectsWith(save, 'WorldContainer').map(({ id, obj }) => {
    const world = data(obj, 'WorldContainer')
    const asteroid = behavior(obj, 'AsteroidGridEntity')?.templateData
    const size = world.worldSize as { x: number; y: number }
    const worldName = typeof world.worldName === 'string' ? world.worldName : ''
    return {
      id,
      name: typeof asteroid?.m_name === 'string' ? asteroid.m_name : worldName,
      worldType: humanize(worldName.replace(/^.*\//, '')),
      width: size.x,
      height: size.y,
      discovered: world.isDiscovered === true,
      startWorld: world.isStartWorld === true,
      visited: world.isDupeVisited === true,
    }
  })
}

export function listDestinations(save: SaveGame): DestinationView[] {
  const obj = saveGameObject(save)
  const manager = obj ? behavior(obj, 'SpacecraftManager')?.templateData : undefined
  const destinations = (manager?.destinations ?? []) as {
    id: number
    type: string
    distance: number
    recoverableElements?: [number, number][]
    availableMass?: number
  }[]
  return destinations.map((d) => ({
    ...destinationState(save, d),
    id: d.id,
    type: humanize(d.type),
    distance: d.distance,
    resources: (d.recoverableElements ?? []).map(([hash, amount]) => ({
      name: findElementByHash(hash)?.name ?? String(hash),
      amount,
    })),
  }))
}

// --- Raw editor -------------------------------------------------------------------------

function kindOf(value: unknown): RawKind {
  if (value === null || value === undefined) return 'null'
  if (value instanceof Uint8Array) return 'bytes'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'bigint') return 'bigint'
  if (typeof value === 'object') return 'object'
  return typeof value as 'string' | 'number' | 'boolean'
}

export function rawGet(save: SaveGame, path: RawPath): unknown {
  let node: unknown = save
  for (const key of path) {
    if (node === null || typeof node !== 'object') throw new Error(`No value at ${path.join('.')}`)
    node = (node as Record<string | number, unknown>)[key]
  }
  return node
}

function rawParent(
  save: SaveGame,
  path: RawPath,
): { parent: Record<string | number, unknown>; key: string | number } {
  if (path.length === 0) throw new Error('Cannot edit the root')
  const parent = rawGet(save, path.slice(0, -1))
  if (parent === null || typeof parent !== 'object')
    throw new Error(`No value at ${path.join('.')}`)
  return { parent: parent as Record<string | number, unknown>, key: path[path.length - 1]! }
}

/** Keep the stored type when a primitive is edited (bigints stay bigints, floats stay numbers). */
function coerce(current: unknown, value: string | number | boolean | null): unknown {
  switch (kindOf(current)) {
    case 'bigint':
      return BigInt(String(value))
    case 'number': {
      const n = Number(value)
      if (!Number.isFinite(n)) throw new Error(`${String(value)} is not a number`)
      return n
    }
    case 'boolean':
      return value === true || value === 'true'
    case 'string':
    case 'null':
      return value === null ? null : String(value)
    default:
      throw new Error('Only primitive values can be edited')
  }
}

/** Groups and behaviors carry a `name`; show it next to the index. */
function labelFor(value: unknown): string | undefined {
  if (kindOf(value) !== 'object') return undefined
  const name = (value as { name?: unknown }).name
  return typeof name === 'string' ? name : undefined
}

const hex = (bytes: Uint8Array) =>
  Array.from(bytes.subarray(0, 16), (b) => b.toString(16).padStart(2, '0')).join(' ') +
  (bytes.length > 16 ? ' …' : '')

export function rawChildren(save: SaveGame, path: RawPath, offset = 0, limit = 500): RawChildren {
  const node = rawGet(save, path)
  const pairs: [string | number, unknown][] =
    node instanceof Uint8Array
      ? []
      : Array.isArray(node)
        ? node.map((v, i) => [i, v])
        : node && typeof node === 'object'
          ? Object.entries(node)
          : []
  const entries = pairs.slice(offset, offset + limit).map(([key, value]): RawEntry => {
    const kind = kindOf(value)
    const entry: RawEntry = { key, path: [...path, key], kind }
    const label = labelFor(value)
    if (label) entry.label = label
    if (kind === 'array') {
      entry.size = (value as unknown[]).length
      entry.canAdd = rawCanAdd(save, entry.path)
    } else if (kind === 'object') entry.size = Object.keys(value as object).length
    else if (kind === 'bytes') {
      entry.size = (value as Uint8Array).length
      entry.value = hex(value as Uint8Array)
    } else if (kind === 'bigint') entry.value = String(value)
    else if (kind === 'null') entry.value = null
    else entry.value = value as string | number | boolean
    return entry
  })
  const result: RawChildren = { entries, total: pairs.length }
  if (Array.isArray(node) && rawCanAdd(save, path)) result.canAdd = true
  return result
}

/**
 * Every ancestor of `path` (the root first) with its children loaded far enough to include the
 * next step down, so the editor can open the whole route to a search result in one round trip.
 */
export function rawReveal(
  save: SaveGame,
  path: RawPath,
  page = 500,
): { path: RawPath; children: RawChildren }[] {
  const out: { path: RawPath; children: RawChildren }[] = []
  for (let depth = 0; depth < path.length; depth++) {
    const parent = path.slice(0, depth)
    const node = rawGet(save, parent)
    const key = path[depth]!
    const position = Array.isArray(node)
      ? Number(key)
      : node && typeof node === 'object'
        ? Object.keys(node).indexOf(String(key))
        : -1
    if (position < 0) throw new Error(`No value at ${path.join('.')}`)
    const limit = Math.ceil((position + 1) / page) * page
    out.push({ path: parent, children: rawChildren(save, parent, 0, limit) })
  }
  return out
}

const STORY_STATES: Record<number, StoryState> = {
  [-1]: 'retrofitted',
  0: 'notStarted',
  1: 'discovered',
  2: 'inProgress',
  3: 'complete',
}
const QUEST_STATES = ['notStarted', 'inProgress', 'completed'] as const

/** Prefab whose `Activatable` shows whether a story machine was switched on. */
const STORY_MACHINES: Record<string, string> = {
  CreatureManipulator: 'GravitasCreatureManipulator',
  HijackHeadquarters: 'HijackedHeadquarters',
  MegaBrainTank: 'MegaBrainTank',
}

interface WorldBox {
  id: number
  name: string
  x: number
  y: number
  width: number
  height: number
}

function worldBoxes(save: SaveGame): WorldBox[] {
  const boxes: WorldBox[] = []
  for (const { obj } of objectsWith(save, 'WorldContainer')) {
    const world = data(obj, 'WorldContainer')
    const asteroid = behavior(obj, 'AsteroidGridEntity')?.templateData
    const name = typeof asteroid?.m_name === 'string' ? asteroid.m_name : world.worldName
    const offset = world.worldOffset as { x: number; y: number } | undefined
    const size = world.worldSize as { x: number; y: number } | undefined
    if (typeof world.id !== 'number' || typeof name !== 'string' || !offset || !size) continue
    boxes.push({ id: world.id, name, x: offset.x, y: offset.y, width: size.x, height: size.y })
  }
  return boxes
}

/**
 * Read-only: story states from `StoryManager`, quest progress from `QuestManager`.
 * Returns an empty list for a save without a `StoryManager`.
 */
export function listStories(save: SaveGame): StoryView[] {
  const saveGame = saveGameObject(save)
  const manager = saveGame ? behavior(saveGame, 'StoryManager')?.templateData : undefined
  const instances = (manager?._stories ?? []) as [
    number,
    {
      storyId: string
      worldId: number
      state: number
      telemetry?: { Retrofitted: number; Discovered: number; InProgress: number; Completed: number }
    },
  ][]
  const questManager = saveGame ? behavior(saveGame, 'QuestManager')?.templateData : undefined
  // Quests are saved per owner: the Lonely Minion's house, or the fossil dig site. Each story
  // exists once per save, so a story's quests belong to one owner; with several, none is shown.
  const questsByOwner = new Map<number, Map<number, number>>()
  for (const [owner, quests] of (questManager?.ownerToQuests ?? []) as [
    number,
    [{ hash: number }, { currentState: number }][],
  ][]) {
    questsByOwner.set(owner, new Map(quests.map(([key, quest]) => [key.hash, quest.currentState])))
  }
  const worlds = worldBoxes(save)
  const cycle = (value: number | undefined) =>
    typeof value === 'number' && value >= 0 ? value : undefined
  return instances
    .map(([, story]) => {
      const entry = storyCatalog.find((s) => s.id === story.storyId)
      const t = story.telemetry
      const world = worlds.find((w) => w.id === story.worldId)
      const machine = STORY_MACHINES[story.storyId]
      // The machine's `Activatable`, for the copy standing in the story's own world.
      const activations = machine
        ? (save.gameObjects.find((g) => g.name === machine)?.gameObjects ?? [])
            .filter(
              (obj) =>
                world !== undefined &&
                obj.position.x >= world.x &&
                obj.position.x < world.x + world.width &&
                obj.position.y >= world.y &&
                obj.position.y < world.y + world.height,
            )
            .map((obj) => behavior(obj, 'Activatable')?.templateData?.activated)
            .filter((v): v is boolean => typeof v === 'boolean')
        : []
      const cycles: StoryView['cycles'] = {}
      for (const [key, value] of [
        ['retrofitted', t?.Retrofitted],
        ['discovered', t?.Discovered],
        ['inProgress', t?.InProgress],
        ['completed', t?.Completed],
      ] as const) {
        const found = cycle(value)
        if (found !== undefined) cycles[key] = found
      }
      const catalogQuests = storyQuests.filter((q) => q.story === story.storyId)
      const owners = [...questsByOwner.values()].filter((quests) =>
        catalogQuests.some((q) => quests.has(hashString(q.id))),
      )
      const owned = owners.length === 1 ? owners[0] : undefined
      return {
        order: entry?.order ?? Number.MAX_SAFE_INTEGER,
        view: {
          id: story.storyId,
          name: entry?.name ?? humanize(story.storyId),
          state: STORY_STATES[story.state] ?? 'unknown',
          world: world?.name,
          cycles,
          quests: catalogQuests
            .filter((q) => owned?.has(hashString(q.id)))
            .map((q) => ({
              id: q.id,
              name: q.name,
              goal: q.goal,
              state: QUEST_STATES[owned?.get(hashString(q.id)) ?? 0] ?? 'unknown',
            })),
          activated: activations.length > 0 ? activations.some(Boolean) : undefined,
        } satisfies StoryView,
      }
    })
    .sort((a, b) => a.order - b.order)
    .map((r) => r.view)
}
