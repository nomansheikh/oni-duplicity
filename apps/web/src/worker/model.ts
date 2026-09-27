import {
  MinionSkills,
  effects as effectCatalog,
  findAmount,
  findAttribute,
  findEffect,
  findGeyser,
  findPersonality,
  findTrait,
  humanize,
  skillGroups,
  traits as traitCatalog,
} from '@oni-duplicity/game-data'
import {
  MAX_VERIFIED_MINOR,
  type Behavior,
  type GameObject,
  type ModifiersExtraData,
  type SaveGame,
  type TemplateData,
} from '@oni-duplicity/save-parser'

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
  sandbox: boolean
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
  /** Grams per second while erupting. */
  rate: number
  eruptionSeconds: number
  iterationSeconds: number
  activeCycles: number
  dormancyCycles: number
}

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
  | { type: 'setGeyserName'; id: string; name: string }

// --- Helpers ---------------------------------------------------------------

const SECONDS_PER_CYCLE = 600
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
  return behavior(obj, 'MinionModifiers')?.extraData as ModifiersExtraData | undefined
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
    sandbox: Boolean(sandbox ?? info.sandboxEnabled),
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
    const config = data(obj, 'Geyser').configuration as Record<string, number>
    const name = behavior(obj, 'UserNameable')?.templateData?.savedName
    const yearSeconds = config.scaledYearLength ?? 0
    const yearPercent = config.scaledYearPercent ?? 0
    const type = findGeyser(prefab)
    return {
      id,
      prefab,
      typeName: type?.name ?? humanize(prefab),
      ...(type?.desc ? { typeDesc: type.desc } : {}),
      name: typeof name === 'string' ? name : (type?.name ?? prefab),
      x: Math.round(obj.position.x),
      y: Math.round(obj.position.y),
      rate: config.scaledRate ?? 0,
      eruptionSeconds: (config.scaledIterationLength ?? 0) * (config.scaledIterationPercent ?? 0),
      iterationSeconds: config.scaledIterationLength ?? 0,
      activeCycles: (yearSeconds * yearPercent) / SECONDS_PER_CYCLE,
      dormancyCycles: (yearSeconds * (1 - yearPercent)) / SECONDS_PER_CYCLE,
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
      return
    }
    case 'setGeyserName': {
      const nameable = behavior(objectById(save, edit.id), 'UserNameable')?.templateData
      if (!nameable) throw new Error('This geyser cannot be renamed')
      nameable.savedName = edit.name
      return
    }
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
    default:
      throw new Error(`Unhandled edit ${edit.type}`)
  }
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** An edit to one duplicant, without its `id` (the editor adds it). */
export type DuplicantEdit = DistributiveOmit<Extract<Edit, { id: string }>, 'id'>
