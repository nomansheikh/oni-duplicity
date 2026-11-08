import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { SeedOption } from '@/lib/tools/seed-catalog'
import { cn } from '@/lib/utils'

/** A searchable list of options in a popover: the target picker of a rule row. */
export function OptionPicker({
  value,
  options,
  placeholder,
  label,
  onChange,
  className,
}: {
  value: string
  options: SeedOption[]
  placeholder: string
  /** Accessible name of the trigger. */
  label: string
  onChange: (id: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((option) => option.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          className={cn('justify-between', !current && 'text-fg-3', className)}
        >
          <span className="truncate">{current?.label ?? (value || placeholder)}</span>
          <ChevronsUpDown className="opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
          <CommandList className="max-h-72">
            <CommandEmpty>Nothing found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={`${option.label} ${option.hint ?? ''} ${option.id}`}
                  onSelect={() => {
                    onChange(option.id)
                    setOpen(false)
                  }}
                >
                  {/* Name over hint: side by side, a long geyser name and its element squeezed
                      each other into an ellipsis and a wrapped hint. */}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span>{option.label}</span>
                    {option.hint && (
                      <span className="type-caption text-muted-foreground">{option.hint}</span>
                    )}
                  </span>
                  {option.id === value && <Check className="shrink-0" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
