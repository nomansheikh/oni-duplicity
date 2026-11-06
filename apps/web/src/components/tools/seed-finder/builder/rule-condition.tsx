import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RulePatch } from '@/lib/tools/seed-builder'
import { countOf, countOp, countRange, type CountOp } from '@/lib/tools/seed-count'
import type { GeyserRule, SeedRule, TraitRule } from '@/seed/rules'

const OPS: { id: CountOp; label: string }[] = [
  { id: 'atLeast', label: 'At least' },
  { id: 'atMost', label: 'At most' },
  { id: 'exactly', label: 'Exactly' },
  { id: 'none', label: 'None' },
]

function GeyserCondition({ rule, onPatch }: { rule: GeyserRule; onPatch: (p: RulePatch) => void }) {
  const op = countOp(rule)
  return (
    <>
      <Select
        value={op}
        onValueChange={(next) => onPatch(countRange(next as CountOp, countOf(rule)))}
      >
        <SelectTrigger className="w-32" aria-label="Count condition">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPS.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {op !== 'none' && (
        <Input
          type="number"
          min={0}
          max={99}
          aria-label="Count"
          className="w-16"
          value={countOf(rule)}
          onChange={(e) => onPatch(countRange(op, e.target.valueAsNumber || 0))}
        />
      )}
    </>
  )
}

function TraitCondition({ rule, onPatch }: { rule: TraitRule; onPatch: (p: RulePatch) => void }) {
  return (
    <Select
      value={rule.presence}
      onValueChange={(presence) => onPatch({ presence: presence as TraitRule['presence'] })}
    >
      <SelectTrigger className="w-32" aria-label="Has or lacks">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="has">Has</SelectItem>
        <SelectItem value="lacks">Lacks</SelectItem>
      </SelectContent>
    </Select>
  )
}

/** The count or has/lacks control of a row; an asteroid rule has none. */
export function RuleCondition({
  rule,
  onPatch,
}: {
  rule: SeedRule
  onPatch: (patch: RulePatch) => void
}) {
  if (rule.kind === 'geyser') return <GeyserCondition rule={rule} onPatch={onPatch} />
  if (rule.kind === 'trait') return <TraitCondition rule={rule} onPatch={onPatch} />
  return <span className="type-small text-muted-foreground">is in the cluster</span>
}
