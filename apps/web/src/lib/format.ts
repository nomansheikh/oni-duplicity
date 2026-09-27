import type { DuplicantProfile, DuplicantView } from '@/worker/model'

export const fmt = (n: number, digits = 1) =>
  n.toLocaleString(undefined, { maximumFractionDigits: digits })

/** `Mining3` → `Mining 3`, `hat_role_mining3` → `Hat Role Mining 3`. */
export function humanize(id: string): string {
  return id
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Portrait layers from a duplicant's appearance slots. */
export function portraitParts(appearance: { slot: string; current: string }[]) {
  const get = (slot: string) => appearance.find((a) => a.slot === slot)?.current
  return { hair: get('hair'), headshape: get('headshape'), eyes: get('eyes') }
}

export function toProfile(dupe: DuplicantView): DuplicantProfile {
  return {
    format: 'duplicity-duplicant@1',
    name: dupe.name,
    gender: dupe.gender,
    traits: dupe.traits.map((t) => t.id),
    interests: dupe.interests.filter((i) => i.active).map((i) => i.id),
    attributes: Object.fromEntries(dupe.attributes.map((a) => [a.id, a.level])),
    skills: dupe.skills.filter((s) => s.mastered).map((s) => s.id),
    experience: dupe.experience,
    appearance: Object.fromEntries(dupe.appearance.map((a) => [a.slot, a.current])),
  }
}
