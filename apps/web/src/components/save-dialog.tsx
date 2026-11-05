import { useEffect, useState } from 'react'
import { Download, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { summarizeChanges, type HistoryEntry } from '@/lib/changes'
import { saveClient } from '@/lib/save-client'

/** The last look before downloading: what changed, and a reminder to keep the original. */
export function SaveDialog({
  open,
  onOpenChange,
  fileName,
  isAutoSave,
  originalSaveName,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileName: string
  isAutoSave: boolean
  originalSaveName: string
  onConfirm: () => void
}) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void saveClient.history().then((list) => !cancelled && setEntries(list))
    return () => {
      cancelled = true
      setEntries(null)
    }
  }, [open])

  const summary = entries ? summarizeChanges(entries) : ''
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Download edited save</DialogTitle>
          <DialogDescription>
            {entries === null
              ? 'Collecting your changes…'
              : entries.length === 0
                ? 'No changes. The download is identical to the original.'
                : `You changed ${summary}.`}
          </DialogDescription>
        </DialogHeader>
        <div
          role="alert"
          className="flex gap-3 rounded-lg border border-chart-3/50 bg-chart-3/10 px-4 py-3 text-sm"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-chart-3" />
          <div className="flex flex-col gap-1">
            <p className="font-medium">Back up your original save first</p>
            <p className="text-muted-foreground">
              The download keeps the name <code>{fileName}</code>. Copy your original{' '}
              <code>.sav</code> somewhere safe before putting the edited file in the game folder.
              {isAutoSave &&
                ` This is an autosave, so the game's autosave rotation may overwrite it${originalSaveName ? ` (it was written from ${originalSaveName})` : ''}.`}
            </p>
          </div>
        </div>
        {entries && entries.length > 0 && (
          <ScrollArea className="max-h-56 rounded-lg border">
            <ol aria-label="Edits" className="flex flex-col py-1">
              {entries.map((entry, i) => (
                <li key={i} className="flex gap-3 px-4 py-1.5 text-sm">
                  <span className="w-6 shrink-0 text-right text-muted-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <span className="min-w-0">{entry.label}</span>
                </li>
              ))}
            </ol>
          </ScrollArea>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={entries === null}>
            <Download />
            Confirm download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
