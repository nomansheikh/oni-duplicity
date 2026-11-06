import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { fmtMass } from '@/lib/format'

export function DeleteDialog({
  open,
  count,
  mass,
  skipped,
  materialName,
  disabled,
  onCancel,
  onConfirm,
}: {
  open: boolean
  count: number
  mass: number
  skipped: number
  materialName: string | undefined
  disabled: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-6" /> Delete {count} loose{' '}
            {count === 1 ? 'item' : 'items'}?
          </DialogTitle>
          <DialogDescription>
            This removes <strong className="text-bad-text">{fmtMass(mass)}</strong> of{' '}
            {materialName} lying on the ground. Stored items are not touched. You can undo it from
            the header.
            {skipped > 0 &&
              ` ${skipped} ${skipped === 1 ? 'item is' : 'items are'} skipped because ${
                skipped === 1 ? 'it is' : 'they are'
              } marked for a move order.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={disabled} onClick={onConfirm}>
            Delete {count}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
