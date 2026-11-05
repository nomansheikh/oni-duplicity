import { useState } from 'react'
import { Check, Plus, SearchX } from 'lucide-react'
import { effectGroupLabels } from '@oni-duplicity/game-data'
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
import { effectDetail, groupEffects } from '@/lib/effects'
import type { Named } from '@/worker/model'
import { EffectModifiers } from './EffectModifiers'
import { EmptyState } from '../empty-state'

/** Add-effect list: grouped into good and bad, with descriptions, modifiers and search. */
export function EffectPicker({
  catalog,
  exclude,
  onSelect,
}: {
  catalog: Named[]
  exclude: string[]
  onSelect: (effectId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const held = new Set(exclude)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus /> Add effect
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[26rem] p-0" align="end">
        <Command>
          <CommandInput placeholder="Search effects…" />
          <CommandList className="max-h-96">
            <CommandEmpty className="p-0">
              <EmptyState
                size="compact"
                className="border-0"
                icon={SearchX}
                title="No such effect"
                description="Nothing matches that. Try another word."
              />
            </CommandEmpty>
            {groupEffects(catalog).map(({ group, items }) => (
              <CommandGroup key={group} heading={effectGroupLabels[group]}>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.name} ${item.id} ${item.desc ?? ''}`}
                    disabled={held.has(item.id)}
                    onSelect={() => {
                      onSelect(item.id)
                      setOpen(false)
                    }}
                    className="flex-col items-start gap-1"
                  >
                    <span className="flex w-full items-center gap-2 font-medium">
                      {item.name}
                      {held.has(item.id) && <Check className="ml-auto" />}
                    </span>
                    {item.desc && (
                      <span className="line-clamp-2 type-small text-muted-foreground">
                        {item.desc}
                      </span>
                    )}
                    <EffectModifiers modifiers={effectDetail(item.id).modifiers} />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
