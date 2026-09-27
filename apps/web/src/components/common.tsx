import { useState, type ComponentProps, type ReactNode } from 'react'
import { Check, Plus } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Named } from '@/worker/model'
import { Portrait } from './portrait/Portrait'
import { canDrawPortrait, type PortraitParts } from './portrait/sprites'

/** Text input that commits on blur or Enter instead of on every keystroke. */
export function CommitInput({
  value,
  onCommit,
  ...props
}: Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'defaultValue'> & {
  value: string
  onCommit: (value: string) => void
}) {
  return (
    <Input
      key={value}
      defaultValue={value}
      onBlur={(e) => e.currentTarget.value !== value && onCommit(e.currentTarget.value)}
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
  className,
  label,
}: {
  value: number
  onCommit: (value: number) => void
  unit?: string
  digits?: number
  min?: number
  className?: string
  label: string
}) {
  const shown = Number(value.toFixed(digits))
  return (
    <InputGroup className={cn('w-32', className)}>
      <InputGroupInput
        key={shown}
        type="number"
        min={min}
        step={digits > 0 ? 1 / 10 ** digits : 1}
        defaultValue={shown}
        aria-label={label}
        className="text-right tabular-nums"
        onBlur={(e) => {
          const next = Number(e.currentTarget.value)
          if (Number.isFinite(next) && next !== shown) onCommit(next)
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

/** Wraps a trigger with a tooltip when there's a description to show. */
export function Hint({ desc, children }: { desc?: string; children: ReactNode }) {
  if (!desc) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-pre-line">{desc}</TooltipContent>
    </Tooltip>
  )
}

/** Combobox: a searchable list of named items with descriptions. */
export function SearchPicker({
  label,
  heading,
  items,
  exclude = [],
  onSelect,
}: {
  label: string
  heading: string
  items: Named[]
  exclude?: string[]
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const excluded = new Set(exclude)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Command>
          <CommandInput placeholder={`Search ${heading.toLowerCase()}…`} />
          <CommandList className="max-h-80">
            <CommandEmpty>Nothing found.</CommandEmpty>
            <CommandGroup heading={heading}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.name} ${item.id}`}
                  disabled={excluded.has(item.id)}
                  onSelect={() => {
                    onSelect(item.id)
                    setOpen(false)
                  }}
                  className="flex-col items-start gap-0.5"
                >
                  <span className="flex w-full items-center gap-2 font-medium">
                    {item.name}
                    {excluded.has(item.id) && <Check className="ml-auto" />}
                  </span>
                  {item.desc && (
                    <span className="line-clamp-2 text-xs text-muted-foreground">{item.desc}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const AVATAR_COLORS = [
  'bg-chart-1 text-primary-foreground',
  'bg-chart-2 text-primary-foreground',
  'bg-chart-3 text-primary-foreground',
  'bg-chart-4 text-white',
  'bg-chart-5 text-white',
]

export function DuplicantAvatar({
  name,
  parts,
  size = 36,
  className,
}: {
  name: string
  parts?: PortraitParts
  size?: number
  className?: string
}) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  const drawable = parts && canDrawPortrait(parts)
  return (
    <Avatar className={cn('bg-muted', className)} style={{ width: size, height: size }}>
      {drawable ? (
        <Portrait parts={parts} size={size} />
      ) : (
        <AvatarFallback
          className={cn('font-heading font-semibold', AVATAR_COLORS[hash % AVATAR_COLORS.length])}
        >
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      )}
    </Avatar>
  )
}
