import { fmt } from '@/lib/format'
import type { DemoliorView } from '@/worker/dlc'
import type { DuplicantView, Summary } from '@/worker/model'

export const STRESS_TEXT = {
  good: 'Colony is calm',
  warn: 'Keep an eye on morale',
  bad: 'Colony is struggling',
} as const

export function average(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

export type Attention = { id: string; tone: 'warn' | 'bad' | 'info'; label: string; text: string }

const STRESSED_AT = 60
const LOW_HEALTH_AT = 35
export const MAX_ATTENTION = 5

/** Things worth a look, derived from data the app already loads. Most urgent first. */
export function attentionItems(
  summary: Summary,
  duplicants: DuplicantView[],
  demolior: DemoliorView | null,
): Attention[] {
  const amount = (d: DuplicantView, id: string) => d.amounts.find((a) => a.id === id)?.value
  const items: Attention[] = []
  if (demolior && demolior.remainingCycles > 0) {
    items.push({
      id: 'demolior',
      tone: 'bad',
      label: 'Impact',
      text: `Demolior hits in ${fmt(demolior.remainingCycles, 1)} cycles (cycle ${fmt(demolior.impactCycle, 1)})`,
    })
  }
  for (const d of duplicants) {
    const health = amount(d, 'HitPoints')
    if (health !== undefined && health < LOW_HEALTH_AT) {
      items.push({
        id: `health-${d.id}`,
        tone: 'bad',
        label: 'Health',
        text: `${d.name} is at ${fmt(health, 0)}% health`,
      })
    }
  }
  for (const d of duplicants) {
    const stress = amount(d, 'Stress')
    if (stress !== undefined && stress >= STRESSED_AT) {
      items.push({
        id: `stress-${d.id}`,
        tone: 'warn',
        label: 'Stress',
        text: `${d.name} is at ${fmt(stress, 0)}% stress`,
      })
    }
  }
  if (summary.debugWasUsed || summary.sandbox) {
    items.push({
      id: 'achievements',
      tone: 'warn',
      label: 'Achievements',
      text: summary.debugWasUsed
        ? 'Achievements are disabled because debug mode was used'
        : 'Achievements are disabled while sandbox mode is on',
    })
  }
  if (summary.unverified) {
    items.push({
      id: 'unverified',
      tone: 'info',
      label: 'Version',
      text: `Save version ${summary.version} is newer than the versions this editor was checked against`,
    })
  }
  return items
}
