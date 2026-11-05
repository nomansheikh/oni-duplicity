import type { FormattedModifier } from '@oni-duplicity/game-data'
import { Badge } from '@/components/ui/badge'

const TONE_VARIANT = { good: 'good', bad: 'bad', neutral: 'outline' } as const

/** Small badges for an effect's attribute modifiers, e.g. "-4 Athletics", "-20/cycle Stress". */
export function EffectModifiers({ modifiers }: { modifiers: FormattedModifier[] }) {
  if (modifiers.length === 0) return null
  return (
    <span className="flex flex-wrap gap-1">
      {modifiers.map((m) => (
        <Badge key={`${m.label}${m.text}`} variant={TONE_VARIANT[m.tone]}>
          {m.text} {m.label}
        </Badge>
      ))}
    </span>
  )
}
