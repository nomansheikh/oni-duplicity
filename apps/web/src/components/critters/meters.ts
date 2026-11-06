import { meterTone, type MeterKind } from '@/components/ui/progress'
import { fmt } from '@/lib/format'
import type { AmountView, CritterView } from '@/worker/model'

export const amount = (c: CritterView, id: string) => c.amounts.find((a) => a.id === id)?.value

/** What each amount measures, how its tone is judged, and the fallback maximum when the save has none. */
export const METERS: Record<
  string,
  {
    label: string
    kind: MeterKind
    fallback?: number
    unit: string
    scale?: number
    digits?: number
  }
> = {
  // Age and wildness are worse the higher they are, so they use the stress rule.
  Age: { label: 'Age', kind: 'stress', fallback: undefined, unit: 'cycles', digits: 1 },
  Wildness: { label: 'Wildness', kind: 'stress', fallback: 100, unit: '%' },
  Fertility: { label: 'Fertility', kind: 'amount', fallback: 100, unit: '%' },
  Calories: { label: 'Calories', kind: 'amount', unit: 'kcal', scale: 1 / 1000, digits: 1 },
  HitPoints: { label: 'Health', kind: 'health', unit: 'HP' },
}

const STATE_WORDS: Record<MeterKind, [string, string, string]> = {
  amount: ['Good', 'Low', 'Critical'],
  health: ['Healthy', 'Hurt', 'Critical'],
  stress: ['Calm', 'Rising', 'High'],
}

export function meterOf(a: AmountView | undefined) {
  if (!a) return null
  const spec = METERS[a.id]
  if (!spec) return null
  const max = a.max ?? spec.fallback
  if (max === undefined || max <= 0) return null
  const pct = Math.min(100, Math.max(0, (a.value / max) * 100))
  const tone = meterTone(spec.kind, pct)
  const state = STATE_WORDS[spec.kind][tone === 'good' ? 0 : tone === 'warn' ? 1 : 2]
  const scale = spec.scale ?? 1
  return {
    spec,
    tone,
    state,
    pct,
    value: a.value * scale,
    max: max * scale,
    text: `${fmt(a.value * scale, spec.digits ?? 0)} / ${fmt(max * scale, spec.digits ?? 0)} ${spec.unit}`,
  }
}
