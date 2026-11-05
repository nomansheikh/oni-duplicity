import { findTraitInfo, type DuplicantModel } from '@oni-duplicity/game-data'

/** The profile fields a paste can carry, named as the paste dialog's sections. */
export type ProfileSectionId =
  | 'name'
  | 'traits'
  | 'interests'
  | 'attributes'
  | 'skills'
  | 'appearance'

/**
 * Sections that only make sense between duplicants of the same model. A bionic rolls bug and
 * booster traits instead of the standard lists, has no interests, learns its own skills
 * (`MinionSkills` carries a model) and has its own body parts. Name, gender and attribute
 * levels are the same on both.
 */
export const MODEL_BOUND_SECTIONS: readonly ProfileSectionId[] = [
  'traits',
  'interests',
  'skills',
  'appearance',
]

/**
 * The model a profile was copied from. Profiles written before the field existed are read from
 * their traits: only a bionic carries a bionic-category trait.
 */
export function profileModel(profile: {
  model?: DuplicantModel
  traits: readonly string[]
}): DuplicantModel {
  if (profile.model) return profile.model
  return profile.traits.some((t) => findTraitInfo(t)?.category === 'bionic')
    ? 'BionicMinion'
    : 'Minion'
}

/** The sections of a profile that cannot be applied to a duplicant of `target`. */
export function blockedSections(
  profile: { model?: DuplicantModel; traits: readonly string[] },
  target: DuplicantModel,
): readonly ProfileSectionId[] {
  return profileModel(profile) === target ? [] : MODEL_BOUND_SECTIONS
}

export const modelLabel = (model: DuplicantModel) =>
  model === 'BionicMinion' ? 'bionic' : 'standard'
