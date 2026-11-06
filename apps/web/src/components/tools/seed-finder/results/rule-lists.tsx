import { Check, X } from 'lucide-react'
import type { SeedRule } from '@/seed/rules'
import { ruleLabel } from './labels'

interface Props {
  rules: SeedRule[]
  matched: string[]
  missed: string[]
  /** Show at most this many per list (the card); omit for all (the big view). */
  limit?: number
}

function Group({
  rules,
  tone,
  limit,
}: {
  rules: SeedRule[]
  tone: 'good' | 'bad'
  limit?: number
}) {
  const shown = limit === undefined ? rules : rules.slice(0, limit)
  const Icon = tone === 'good' ? Check : X
  return (
    <ul className="flex flex-col gap-0.5">
      {shown.map((rule) => (
        <li key={rule.id} className="type-small flex items-start gap-1.5">
          <Icon
            aria-label={tone === 'good' ? 'Matched' : 'Missed'}
            className={`mt-1 size-3.5 shrink-0 ${tone === 'good' ? 'text-good' : 'text-bad-text'}`}
          />
          <span className={tone === 'good' ? '' : 'text-muted-foreground'}>
            {ruleLabel(rule)}
            {rule.mode === 'nice' && <span className="type-caption"> (+{rule.weight})</span>}
          </span>
        </li>
      ))}
      {limit !== undefined && rules.length > limit && (
        <li className="type-caption text-muted-foreground">+{rules.length - limit} more</li>
      )}
    </ul>
  )
}

/** Matched rules, then missed ones. Ids with no rule in the list are skipped. */
export function RuleLists({ rules, matched, missed, limit }: Props) {
  const byId = new Map(rules.map((rule) => [rule.id, rule]))
  const pick = (ids: string[]) => ids.flatMap((id) => byId.get(id) ?? [])
  const yes = pick(matched)
  const no = pick(missed)
  return (
    <div className="flex flex-col gap-2">
      {yes.length > 0 && <Group rules={yes} tone="good" limit={limit} />}
      {no.length > 0 && <Group rules={no} tone="bad" limit={limit} />}
    </div>
  )
}
