import type { DuplicantView } from '@/worker/model'

export type SortKey = 'save' | 'name' | 'arrival' | 'experience' | 'skills' | 'stress' | 'model'

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'save', label: 'Save order' },
  { key: 'name', label: 'Name' },
  { key: 'arrival', label: 'Arrival' },
  { key: 'experience', label: 'Experience' },
  { key: 'skills', label: 'Skills mastered' },
  { key: 'stress', label: 'Stress' },
  { key: 'model', label: 'Model' },
]

/** The direction a key starts in: biggest first for the measures, A to Z for the rest. */
export const defaultDescending = (key: SortKey) =>
  key === 'experience' || key === 'skills' || key === 'stress'

export const stressOf = (d: DuplicantView) => d.amounts.find((a) => a.id === 'Stress')?.value ?? 0
export const masteredOf = (d: DuplicantView) => d.skills.filter((s) => s.mastered).length
/** The game stores the cycle number; the first three arrive in cycle 0. */
export const arrivalCycle = (d: DuplicantView) => Math.round(d.arrivalTime)

/** Duplicants whose name, a trait or an active interest contains every word of the query. */
export function searchDuplicants(list: DuplicantView[], query: string): DuplicantView[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return list
  return list.filter((d) => {
    const haystack = [
      d.name,
      ...d.traits.flatMap((t) => [t.name, t.id]),
      ...d.interests.filter((i) => i.active).flatMap((i) => [i.name, i.id]),
    ]
      .join('\n')
      .toLowerCase()
    return words.every((w) => haystack.includes(w))
  })
}

/**
 * The list in `key` order, smallest or A first unless `descending`. Ties keep the save's order.
 */
export function sortDuplicants(
  list: DuplicantView[],
  key: SortKey,
  descending: boolean,
): DuplicantView[] {
  if (key === 'save') return descending ? [...list].reverse() : list
  const compare = (a: DuplicantView, b: DuplicantView): number => {
    switch (key) {
      case 'name':
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      case 'arrival':
        return a.arrivalTime - b.arrivalTime
      case 'experience':
        return a.experience - b.experience
      case 'skills':
        return masteredOf(a) - masteredOf(b)
      case 'stress':
        return stressOf(a) - stressOf(b)
      case 'model':
        return Number(a.isBionic) - Number(b.isBionic)
    }
  }
  const sign = descending ? -1 : 1
  return list
    .map((d, i) => ({ d, i }))
    .sort((x, y) => sign * compare(x.d, y.d) || x.i - y.i)
    .map((x) => x.d)
}
