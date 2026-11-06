import {
  MinionSkills,
  effects as effectCatalog,
  findAmount,
  findAttribute,
  findEffect,
  findPersonality,
  findTrait,
  skillGroups,
  traits as traitCatalog,
} from '@oni-duplicity/game-data'
import type { SaveGame } from '@oni-duplicity/save-parser'
import { appearanceOf } from '../accessories.ts'
import { duplicantAmountLimit } from '../amount-limits.ts'
import type { Catalogs, DuplicantView } from '../duplicant-types.ts'
import {
  SECONDS_PER_CYCLE,
  behavior,
  data,
  dlcIds,
  masteredSkillIds,
  modelNameOf,
  modelOf,
  modifiers,
  named,
  objectsWith,
  skillGroupOf,
  withName,
} from '../save-helpers.ts'
import type { SkillView } from '../view-types.ts'

export function listDuplicants(save: SaveGame): DuplicantView[] {
  const activeDlcs = new Set(dlcIds(save))
  // The header stores `GameClock.GetCycle()`; MinionPersonalityPanel shows the age as that minus
  // `arrivalTime`.
  const cycle = save.header.gameInfo.numberOfCycles
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
    const model = modelNameOf(obj, prefab)
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
      model: modelOf(obj, prefab),
      dlcIds: [...activeDlcs],
      arrivalTime: typeof identity.arrivalTime === 'number' ? identity.arrivalTime : 0,
      age: Math.max(
        0,
        Math.floor(cycle - (typeof identity.arrivalTime === 'number' ? identity.arrivalTime : 0)),
      ),
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
      amounts: (modifiers(obj)?.amounts ?? []).map((a) => {
        const limit = duplicantAmountLimit(
          a.name,
          prefab === 'BionicMinion',
          traitIds,
          masteredSkillIds(obj),
        )
        return {
          ...named(a.name, findAmount(a.name)),
          value: Number((a.value as { value: number }).value),
          ...(limit
            ? { max: limit.max, ...(limit.min === 0 ? {} : { min: limit.min }) }
            : { warning: 'No confirmed maximum for this amount, so it is not clamped.' }),
        }
      }),
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
