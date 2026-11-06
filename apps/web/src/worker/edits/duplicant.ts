import type { GameObject, TemplateData } from '@oni-duplicity/save-parser'
import { ACCESSORY_PREFIX, SLOT_TYPES } from '../accessories.ts'
import { limitOf, reclampAmounts } from '../amount-limits.ts'
import { assertTraitsAllowed, type DuplicantContext } from '../duplicant-context.ts'
import type { Edit } from '../edit-types.ts'
import { SECONDS_PER_CYCLE, data, modifiers } from '../save-helpers.ts'
import { applyProfile } from './profile.ts'

function resumeOf(obj: GameObject): TemplateData {
  return data(obj, 'MinionResume')
}

type SavedEffect = { id: string; timeRemaining: number; saved?: boolean }

function effectsOf(obj: GameObject): SavedEffect[] {
  const effects = data(obj, 'Klei.AI.Effects')
  effects.saveLoadEffects ??= []
  return effects.saveLoadEffects as SavedEffect[]
}

export function applyObjectEdit(obj: GameObject, edit: Edit, ctx: DuplicantContext): void {
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
      assertTraitsAllowed([edit.traitId], obj, ctx)
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
      reclampAmounts(obj, edit.id)
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
      // Losing BionicsC3 lowers the battery cap and losing Swimming the breath cap; bring the
      // value down in the same edit, so undo restores both.
      reclampAmounts(obj, edit.id)
      return
    }
    case 'setExperience':
      resumeOf(obj).totalExperienceGained = Math.max(0, edit.experience)
      return
    case 'setAmount': {
      const amount = modifiers(obj)?.amounts.find((a) => a.name === edit.amountId)
      if (!amount) throw new Error(`No amount ${edit.amountId}`)
      if (!Number.isFinite(edit.value)) throw new Error(`Not a finite amount: ${edit.value}`)
      // The game keeps amounts within their range, so never write past it.
      const limit = limitOf(obj, edit.id, edit.amountId)
      ;(amount.value as { value: number }).value = limit
        ? Math.min(Math.max(edit.value, limit.min), limit.max)
        : edit.value
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
      applyProfile(obj, edit.profile, new Set(edit.sections), ctx)
      return
    default:
      throw new Error(`Unhandled edit ${edit.type}`)
  }
}
