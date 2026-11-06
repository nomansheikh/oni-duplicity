import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { RuleKind, RulePatch } from '@/lib/tools/seed-builder'
import type { SeedOption } from '@/lib/tools/seed-catalog'
import type { SeedRule } from '@/seed/rules'
import { OptionPicker } from './option-picker'
import { RuleCondition } from './rule-condition'
import { RuleScopePicker } from './rule-scope'

const KINDS: { id: RuleKind; label: string }[] = [
  { id: 'geyser', label: 'Geyser' },
  { id: 'trait', label: 'Trait' },
  { id: 'asteroid', label: 'Asteroid' },
]

export interface RuleOptions {
  geysers: SeedOption[]
  traits: SeedOption[]
  asteroids: SeedOption[]
}

function targetOf(rule: SeedRule): string {
  return rule.kind === 'geyser' ? rule.geyser : rule.kind === 'trait' ? rule.trait : rule.asteroid
}

function targetPatch(rule: SeedRule, id: string): RulePatch {
  return rule.kind === 'geyser'
    ? { geyser: id }
    : rule.kind === 'trait'
      ? { trait: id }
      : { asteroid: id }
}

/** One rule: type, target, condition, scope, must or nice, weight, remove. */
export function RuleRow({
  rule,
  options,
  onKind,
  onPatch,
  onRemove,
}: {
  rule: SeedRule
  options: RuleOptions
  onKind: (kind: RuleKind) => void
  onPatch: (patch: RulePatch) => void
  onRemove: () => void
}) {
  const targets =
    rule.kind === 'geyser'
      ? options.geysers
      : rule.kind === 'trait'
        ? options.traits
        : options.asteroids
  return (
    <li data-testid="seed-rule" className="well flex flex-wrap items-center gap-2 px-3 py-2">
      <Select value={rule.kind} onValueChange={(kind) => onKind(kind as RuleKind)}>
        <SelectTrigger className="w-28" aria-label="Rule type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {KINDS.map((kind) => (
            <SelectItem key={kind.id} value={kind.id}>
              {kind.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <OptionPicker
        className="w-56"
        label={rule.kind === 'geyser' ? 'Geyser' : rule.kind === 'trait' ? 'Trait' : 'Asteroid'}
        placeholder={`Pick a ${rule.kind}`}
        value={targetOf(rule)}
        options={targets}
        onChange={(id) => onPatch(targetPatch(rule, id))}
      />
      <RuleCondition rule={rule} onPatch={onPatch} />
      {rule.kind !== 'asteroid' && (
        <RuleScopePicker
          scope={rule.scope}
          asteroids={options.asteroids}
          onChange={(scope) => onPatch({ scope })}
        />
      )}
      <ToggleGroup
        type="single"
        variant="outline"
        aria-label="Must or nice to have"
        value={rule.mode}
        onValueChange={(mode) => mode && onPatch({ mode: mode as SeedRule['mode'] })}
        className="ml-auto"
      >
        <ToggleGroupItem value="must">Must</ToggleGroupItem>
        <ToggleGroupItem value="nice">Nice</ToggleGroupItem>
      </ToggleGroup>
      {rule.mode === 'nice' && (
        <label className="flex items-center gap-1.5 type-caption text-muted-foreground">
          Weight
          <Input
            type="number"
            min={1}
            max={99}
            className="w-16"
            value={rule.weight}
            onChange={(e) => onPatch({ weight: e.target.valueAsNumber || 1 })}
          />
        </label>
      )}
      <Button variant="ghost" size="icon" aria-label="Remove rule" onClick={onRemove}>
        <X />
      </Button>
    </li>
  )
}
