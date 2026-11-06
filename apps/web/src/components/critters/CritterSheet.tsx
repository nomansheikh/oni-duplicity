import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { CritterView, DuplicantEdit, Edit } from '@/worker/model'
import { AmountGroup } from '../duplicants/tabs'
import { VitalsPanel } from './CritterCells'

export function CritterSheet({
  critter: open,
  onClose,
  onEdit,
}: {
  critter: CritterView | null
  onClose: () => void
  onEdit: (edit: Edit) => void
}) {
  return (
    <Sheet open={open !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        {open && (
          <>
            <SheetHeader>
              <SheetTitle className="type-h2">{open.name}</SheetTitle>
              <SheetDescription>
                {open.family} · at {open.x}, {open.y}
              </SheetDescription>
            </SheetHeader>
            <div className="@container/main flex flex-col gap-5 px-4 pb-4">
              <VitalsPanel critter={open} />
              <AmountGroup
                amounts={open.amounts}
                edit={(change: DuplicantEdit) => onEdit({ ...change, id: open.id } as Edit)}
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
