import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { fmt } from '@/lib/format'
import { SEED_LIMIT_PICKS, clampSeedLimit, type SeedLimit } from '@/lib/tools/seed-limit'

const UNLIMITED = 'unlimited'

/**
 * How many seeds Find tries: a number field with quick picks, or Unlimited to run until Stop.
 * The field commits on blur or Enter.
 */
export function SeedLimitField({
  value,
  disabled,
  onChange,
}: {
  value: SeedLimit
  disabled: boolean
  onChange: (value: SeedLimit) => void
}) {
  const picked = value === null ? UNLIMITED : String(value)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="seed-limit" className="type-label">
        Seeds to try
      </label>
      <Input
        id="seed-limit"
        key={value ?? UNLIMITED}
        type="number"
        min={1}
        step={100}
        disabled={disabled}
        defaultValue={value ?? ''}
        placeholder="No limit"
        className="w-28 text-right tabular-nums"
        onBlur={(e) => {
          const text = e.currentTarget.value
          if (text === '') {
            e.currentTarget.value = value === null ? '' : String(value)
            return
          }
          const next = clampSeedLimit(Number(text))
          e.currentTarget.value = String(next)
          if (next !== value) onChange(next)
        }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        aria-label="Seed limit quick picks"
        disabled={disabled}
        value={picked}
        onValueChange={(next) => next && onChange(next === UNLIMITED ? null : Number(next))}
      >
        {SEED_LIMIT_PICKS.map((pick) => (
          <ToggleGroupItem key={pick} value={String(pick)}>
            {fmt(pick, 0)}
          </ToggleGroupItem>
        ))}
        <ToggleGroupItem value={UNLIMITED}>Unlimited</ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
