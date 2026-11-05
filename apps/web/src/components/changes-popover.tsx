import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { saveClient } from '@/lib/save-client'

/** The unsaved edits, newest first, so they can be reviewed before downloading. */
export function ChangesPopover({ count, revision }: { count: number; revision: number }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void saveClient.history().then((list) => !cancelled && setItems(list.toReversed()))
    return () => {
      cancelled = true
    }
  }, [open, revision])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" className="hidden sm:inline-flex">
          <History />
          {count} unsaved {count === 1 ? 'edit' : 'edits'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b px-4 py-3">
          <p className="font-heading font-semibold">Unsaved changes</p>
          <p className="text-sm text-muted-foreground">Newest first. Undo removes the top one.</p>
        </div>
        <ScrollArea className="max-h-80">
          <ol className="flex flex-col py-1">
            {items.map((label, i) => (
              <li key={items.length - i} className="flex gap-3 px-4 py-1.5 text-sm">
                <span className="w-6 shrink-0 text-right text-muted-foreground tabular-nums">
                  {items.length - i}
                </span>
                <span className="min-w-0">{label}</span>
              </li>
            ))}
          </ol>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
