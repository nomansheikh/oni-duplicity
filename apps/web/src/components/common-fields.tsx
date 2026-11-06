import { useState, type ComponentProps } from 'react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { Input } from '@/components/ui/input'
import { draftAfterModelChange, textToCommit } from '@/lib/draft'
import { cn } from '@/lib/utils'

/**
 * Text input that commits on blur or Enter instead of on every keystroke.
 *
 * Edits reach `value` after a worker round trip, so `value` can change while the user is
 * typing (the answer to an earlier edit). A focused field keeps its draft; remounting it
 * on every new value would throw away what was just typed.
 */
export function CommitInput({
  value,
  onCommit,
  ...props
}: Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'defaultValue'> & {
  value: string
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    setDraft(draftAfterModelChange(draft, focused))
  }
  return (
    <Input
      value={draft ?? value}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        const text = textToCommit(draft, value)
        if (text === null) setDraft(null)
        else onCommit(text)
      }}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      {...props}
    />
  )
}

/** Number input with an optional unit, committing on blur or Enter. */
export function NumberField({
  value,
  onCommit,
  unit,
  digits = 0,
  min,
  max,
  disabled,
  className,
  label,
}: {
  value: number
  onCommit: (value: number) => void
  unit?: string
  digits?: number
  min?: number
  max?: number
  disabled?: boolean
  className?: string
  label: string
}) {
  const shown = Number(value.toFixed(digits))
  return (
    <InputGroup className={cn('w-40', className)}>
      <InputGroupInput
        key={shown}
        type="number"
        min={min}
        max={max}
        disabled={disabled}
        step={digits > 0 ? 1 / 10 ** digits : 1}
        defaultValue={shown}
        aria-label={label}
        className="text-right tabular-nums"
        onBlur={(e) => {
          const typed = Number(e.currentTarget.value)
          if (!Number.isFinite(typed) || e.currentTarget.value === '') {
            e.currentTarget.value = String(shown)
            return
          }
          const next = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, typed))
          // Show what is committed, also when clamping lands on the current value.
          e.currentTarget.value = String(Number(next.toFixed(digits)))
          if (next !== shown) onCommit(next)
        }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      {unit && (
        <InputGroupAddon align="inline-end">
          <InputGroupText>{unit}</InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}
