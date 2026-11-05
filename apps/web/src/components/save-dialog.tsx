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

const code = 'bg-inset px-1.5 py-0.5 font-mono type-caption text-foreground border border-ink'

/** The last look before downloading: what changed, and a reminder to keep the original. */
export function SaveDialog({
  open,
  onOpenChange,
  fileName,
  isAutoSave,
  originalSaveName,
  saving,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileName: string
  isAutoSave: boolean
  originalSaveName: string
  saving: boolean
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
        <div role="alert" className="m-3 flex gap-3 border border-ink bg-well px-4 py-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warn" />
          <div className="flex flex-col gap-1">
            <p className="type-h3 text-warn uppercase">Back up your original save first</p>
            <p className="type-small text-muted-foreground">
              The download keeps the name <code className={code}>{fileName}</code>. Copy your
              original <code className={code}>.sav</code> somewhere safe before putting the edited
              file in the game folder.
              {isAutoSave &&
                ` This is an autosave, so the game's autosave rotation may overwrite it${originalSaveName ? ` (it was written from ${originalSaveName})` : ''}.`}
            </p>
          </div>
        </div>
        {entries && entries.length > 0 && (
          <ScrollArea className="field-game mx-3 mb-3 max-h-56">
            <ol aria-label="Edits" className="flex flex-col py-1">
              {entries.map((entry, i) => (
                <li
                  key={i}
                  className="type-small flex gap-3 border-b border-ink/60 px-4 py-1.5 last:border-b-0"
                >
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
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={entries === null || saving}>
            <Download />
            Confirm download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
