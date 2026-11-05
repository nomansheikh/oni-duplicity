import {
  findTraitInfo,
  traitConflicts,
  traitUnavailable,
  type DuplicantModel,
  type TraitCategory,
  type TraitConflict,
} from '@oni-duplicity/game-data'

interface NamedLike {
  id: string
  name: string
  desc?: string
}

/** What the trait helpers need of a duplicant (a `DuplicantView` has all of it). */
export interface TraitSubject {
  model: DuplicantModel
  dlcIds: readonly string[]
  traits: readonly NamedLike[]
  interests: readonly (NamedLike & { active: boolean })[]
}

export interface TraitChoice {
  trait: NamedLike
  category: TraitCategory | undefined
  state: 'available' | 'held' | 'conflict'
  /** Why the trait is blocked, in a sentence; set for `conflict`. */
  reason?: string
}

/** Order the categories are listed in. */
export const CATEGORY_ORDER: TraitCategory[] = [
  'positive',
  'negative',
  'congenital',
  'genetic',
  'bionic',
  'stress',
  'joy',
  'special',
  'need',
]

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

/** "Can't be combined with the trait Narcolepsy and the Mining interest." */
export function explainConflicts(
  conflicts: TraitConflict[],
  subject: Pick<TraitSubject, 'traits' | 'interests'>,
  catalog: readonly NamedLike[],
): string {
  const traitName = (id: string) =>
    subject.traits.find((t) => t.id.toLowerCase() === id.toLowerCase())?.name ??
    catalog.find((t) => t.id.toLowerCase() === id.toLowerCase())?.name ??
    id
  const interestName = (id: string) =>
    subject.interests.find((i) => i.id.toLowerCase() === id.toLowerCase())?.name ?? id
  const traits = conflicts.filter((c) => c.kind === 'trait').map((c) => traitName(c.id))
  const interests = conflicts.filter((c) => c.kind === 'interest').map((c) => interestName(c.id))
  const parts: string[] = []
  if (traits.length)
    parts.push(`${traits.length > 1 ? 'the traits' : 'the trait'} ${joinNames(traits)}`)
  if (interests.length) {
    parts.push(`the ${joinNames(interests)} ${interests.length > 1 ? 'interests' : 'interest'}`)
  }
  return `Can't be combined with ${parts.join(' and ')}.`
}

/**
 * The catalog traits a duplicant could take, for the add-trait list. Traits its model or the
 * save's DLC rule out are left out and counted in `hidden`; the rest are `available`, `held`
 * or `conflict` (blocked by a trait or interest the duplicant has).
 */
export function traitChoices(
  subject: TraitSubject,
  catalog: readonly NamedLike[],
): { choices: TraitChoice[]; hidden: number } {
  const held = new Set(subject.traits.map((t) => t.id.toLowerCase()))
  const heldIds = subject.traits.map((t) => t.id)
  const interests = subject.interests.filter((i) => i.active).map((i) => i.id)
  const choices: TraitChoice[] = []
  let hidden = 0
  for (const trait of catalog) {
    const unavailable = traitUnavailable(trait.id, subject.model, subject.dlcIds)
    if (unavailable) {
      if (unavailable !== 'inert') hidden++
      continue
    }
    const category = findTraitInfo(trait.id)?.category
    if (held.has(trait.id.toLowerCase())) {
      choices.push({ trait, category, state: 'held' })
      continue
    }
    const conflicts = traitConflicts(trait.id, heldIds, interests)
    choices.push(
      conflicts.length
        ? {
            trait,
            category,
            state: 'conflict',
            reason: explainConflicts(conflicts, subject, catalog),
          }
        : { trait, category, state: 'available' },
    )
  }
  return { choices, hidden }
}

/** Conflicts among the traits and interests a duplicant already has, for a warning line. */
export function heldConflicts(
  subject: TraitSubject,
  catalog: readonly NamedLike[],
): Map<string, string> {
  const interests = subject.interests.filter((i) => i.active).map((i) => i.id)
  const out = new Map<string, string>()
  for (const trait of subject.traits) {
    const others = subject.traits.map((t) => t.id).filter((id) => id !== trait.id)
    const conflicts = traitConflicts(trait.id, others, interests)
    if (conflicts.length) out.set(trait.id, explainConflicts(conflicts, subject, catalog))
  }
  return out
}
