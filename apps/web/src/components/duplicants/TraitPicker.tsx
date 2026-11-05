import { useState } from 'react'
import { Ban, Check, Plus } from 'lucide-react'
import { traitCategoryLabels, type TraitCategory } from '@oni-duplicity/game-data'
import { Badge } from '@/components/ui/badge'
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
import { CATEGORY_ORDER, traitChoices, type TraitSubject } from '@/lib/traits'
import { cn } from '@/lib/utils'
import type { Named } from '@/worker/model'
import { modelLabel } from '@/lib/profile'

const CATEGORY_STYLE: Record<TraitCategory, string> = {
  positive: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  negative: 'border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300',
  congenital: 'border-pink-500/40 bg-pink-500/15 text-pink-700 dark:text-pink-300',
  genetic: 'border-teal-500/40 bg-teal-500/15 text-teal-700 dark:text-teal-300',
  bionic: 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300',
  stress: 'border-orange-500/40 bg-orange-500/15 text-orange-700 dark:text-orange-300',
  joy: 'border-yellow-500/40 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
  special: 'border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300',
  need: 'border-slate-500/40 bg-slate-500/15 text-slate-700 dark:text-slate-300',
}

/** A colour-coded label for a trait category. */
export function TraitCategoryBadge({
  category,
  className,
}: {
  category: TraitCategory | undefined
  className?: string
}) {
  if (!category) return null
  return (
    <Badge
      variant="outline"
      data-category={category}
      className={cn(CATEGORY_STYLE[category], className)}
    >
      {traitCategoryLabels[category]}
    </Badge>
  )
}

/**
 * Add-trait list: traits the duplicant's model or the save's DLC rule out are left out, and
 * traits that clash with a trait or interest it has are shown but blocked, with the reason.
 */
export function TraitPicker({
  subject,
  catalog,
  onSelect,
}: {
  subject: TraitSubject
  catalog: Named[]
  onSelect: (traitId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const { choices, hidden } = traitChoices(subject, catalog)
  const groups = [...CATEGORY_ORDER, undefined].map((category) => ({
    category,
    items: choices.filter((c) => c.category === category),
  }))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus /> Add trait
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[26rem] p-0" align="end">
        <Command>
          <CommandInput placeholder="Search traits…" />
          <CommandList className="max-h-96">
            <CommandEmpty>Nothing found.</CommandEmpty>
            {groups
              .filter((g) => g.items.length > 0)
              .map((g) => (
                <CommandGroup
                  key={g.category ?? 'other'}
                  heading={g.category ? traitCategoryLabels[g.category] : 'Other'}
                >
                  {g.items.map(({ trait, state, reason, category }) => (
                    <CommandItem
                      key={trait.id}
                      value={`${trait.name} ${trait.id}`}
                      disabled={state !== 'available'}
                      onSelect={() => {
                        onSelect(trait.id)
                        setOpen(false)
                      }}
                      className="flex-col items-start gap-0.5"
                    >
                      <span className="flex w-full items-center gap-2 font-medium">
                        {trait.name}
                        <TraitCategoryBadge category={category} className="ml-auto" />
                        {state === 'held' && <Check />}
                        {state === 'conflict' && <Ban className="text-destructive" />}
                      </span>
                      {state === 'conflict' ? (
                        <span className="text-xs text-destructive">{reason}</span>
                      ) : (
                        trait.desc && (
                          <span className="line-clamp-2 text-xs text-muted-foreground">
                            {trait.desc}
                          </span>
                        )
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
          </CommandList>
          {hidden > 0 && (
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">
              {hidden} more traits are hidden: they need DLC this save lacks or belong to{' '}
              {subject.model === 'BionicMinion' ? 'standard' : 'bionic'} duplicants, not{' '}
              {modelLabel(subject.model)} ones.
            </p>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
