import { useState, type ReactNode } from 'react'
import { Check, Plus } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Named } from '@/worker/model'

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
                    <span className="line-clamp-2 type-caption text-muted-foreground">
                      {item.desc}
                    </span>
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
