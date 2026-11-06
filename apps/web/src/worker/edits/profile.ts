import { skillGroups } from '@oni-duplicity/game-data'
import type { GameObject } from '@oni-duplicity/save-parser'
import { blockedSections, modelLabel, profileModel } from '../../lib/profile.ts'
import { assertTraitsAllowed, type DuplicantContext } from '../duplicant-context.ts'
import type { AccessorySlot, DuplicantProfile, ProfileSection } from '../duplicant-types.ts'
import { behavior, data, modelOf } from '../save-helpers.ts'
import { applyObjectEdit } from './duplicant.ts'

export function applyProfile(
  obj: GameObject,
  profile: DuplicantProfile,
  sections: Set<ProfileSection>,
  ctx: DuplicantContext,
): void {
  if (profile.format !== 'duplicity-duplicant@1')
    throw new Error('Not a Duplicity duplicant profile')
  // A bionic and a standard duplicant do not share traits, interests, skills or body parts.
  const target = modelOf(obj, ctx.prefab)
  const blocked = blockedSections(profile, target).filter((s) => sections.has(s))
  if (blocked.length > 0) {
    throw new Error(
      `A ${modelLabel(profileModel(profile))} profile's ${blocked.join(', ')} cannot be applied to a ${modelLabel(target)} duplicant`,
    )
  }
  if (sections.has('traits')) assertTraitsAllowed(profile.traits, obj, ctx)
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
        applyObjectEdit(
          obj,
          { type: 'setAccessory', id: '', slot: slot as AccessorySlot, number },
          ctx,
        )
    }
  }
}
