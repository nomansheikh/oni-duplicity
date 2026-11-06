import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SeedOption } from '@/lib/tools/seed-catalog'
import type { RuleScope } from '@/seed/rules'

const toValue = (scope: RuleScope) =>
  scope.kind === 'asteroid' ? `asteroid:${scope.asteroid}` : scope.kind

function fromValue(value: string): RuleScope {
  if (value.startsWith('asteroid:')) return { kind: 'asteroid', asteroid: value.slice(9) }
  return value === 'start' ? { kind: 'start' } : { kind: 'anywhere' }
}

/** Where a rule looks: the start asteroid, one named asteroid, or the whole cluster. */
export function RuleScopePicker({
  scope,
  asteroids,
  onChange,
}: {
  scope: RuleScope
  asteroids: SeedOption[]
  onChange: (scope: RuleScope) => void
}) {
  return (
    <Select value={toValue(scope)} onValueChange={(value) => onChange(fromValue(value))}>
      <SelectTrigger className="w-44" aria-label="Where to look">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="anywhere">Anywhere</SelectItem>
        <SelectItem value="start">Start asteroid</SelectItem>
        {asteroids.map((asteroid) => (
          <SelectItem key={asteroid.id} value={`asteroid:${asteroid.id}`}>
            {asteroid.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
