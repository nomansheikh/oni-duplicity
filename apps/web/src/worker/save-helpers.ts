import { humanize, type DuplicantModel } from '@oni-duplicity/game-data'
import type {
  Behavior,
  GameObject,
  ModifiersExtraData,
  SaveGame,
  TemplateData,
} from '@oni-duplicity/save-parser'
import type { Named } from './view-types.ts'

export const SECONDS_PER_CYCLE = 600

export function traitIdsOf(obj: GameObject): string[] {
  return (behavior(obj, 'Klei.AI.Traits')?.templateData?.TraitIds ?? []) as string[]
}

export function masteredSkillIds(obj: GameObject): string[] {
  const resume = behavior(obj, 'MinionResume')?.templateData
  return ((resume?.MasteryBySkillID ?? []) as [string, boolean][])
    .filter(([, mastered]) => mastered === true)
    .map(([id]) => id)
}

export function behavior(obj: GameObject, name: string): Behavior | undefined {
  return obj.behaviors.find((b) => b.name === name)
}

export function data(obj: GameObject, name: string): TemplateData {
  const found = behavior(obj, name)?.templateData
  if (!found) throw new Error(`Object has no decoded "${name}" behavior`)
  return found
}

/** Objects are addressed as `<prefab>:<index>`, stable for the lifetime of a loaded save. */
export function objectsWith(
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

export function dlcIds(save: SaveGame): string[] {
  const info = save.header.gameInfo
  if (Array.isArray(info.dlcIds)) return info.dlcIds.filter((id) => id !== '')
  return info.dlcId ? [info.dlcId] : []
}

/** The model name a duplicant's identity saves (`Minion`, `BionicMinion`, a mod's), else its prefab. */
export function modelNameOf(obj: GameObject, prefab: string): string {
  const model = behavior(obj, 'MinionIdentity')?.templateData?.model as
    | { name?: string }
    | undefined
  return model?.name ?? prefab
}

/** Standard or bionic; the one place that decides it, for the list and for every edit. */
export function modelOf(obj: GameObject, prefab: string): DuplicantModel {
  return modelNameOf(obj, prefab) === 'BionicMinion' ? 'BionicMinion' : 'Minion'
}

export function named(id: string, entry: { name: string; desc?: string } | undefined): Named {
  return entry
    ? { id, name: entry.name, ...(entry.desc ? { desc: entry.desc } : {}) }
    : { id, name: humanize(id) }
}

/** Personality descriptions refer to the duplicant as `{0}`. */
export function withName(entry: Named, name: unknown): Named {
  if (!entry.desc || typeof name !== 'string') return entry
  return { ...entry, desc: entry.desc.replace(/\{0\}/g, name) }
}

export function modifiers(obj: GameObject): ModifiersExtraData | undefined {
  const b = behavior(obj, 'MinionModifiers') ?? behavior(obj, 'Klei.AI.Modifiers')
  return b?.extraData as ModifiersExtraData | undefined
}

/** `Mining3` → `Mining`; the skill tree groups skills by this prefix. */
export function skillGroupOf(skillId: string): string {
  return skillId.replace(/\d+$/, '')
}

export function splitId(id: string): { group: string; index: number } {
  const split = id.lastIndexOf(':')
  return { group: id.slice(0, split), index: Number(id.slice(split + 1)) }
}

export function primary(obj: GameObject): TemplateData {
  return data(obj, 'PrimaryElement')
}

export const instanceId = (obj: GameObject): number | undefined =>
  behavior(obj, 'KPrefabID')?.templateData?.InstanceID as number | undefined
