import { Copy, EllipsisVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DuplicantView, Edit } from '@/worker/model'

const BIONIC_REASON =
  'Bionic duplicants cannot be cloned: their boosters and battery banks refer back to them'

/** Clone button for the duplicant card. */
export function CloneButton({ dupe, onClone }: { dupe: DuplicantView; onClone: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={dupe.isBionic}
      title={dupe.isBionic ? BIONIC_REASON : undefined}
      onClick={onClone}
    >
      <Copy /> Clone
    </Button>
  )
}

/** The roster's menu, with a clone entry for the selected duplicant. */
export function RosterMenu({
  selected,
  onEdit,
}: {
  selected: DuplicantView | undefined
  onEdit: (edit: Edit) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Roster actions">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={!selected || selected.isBionic}
          title={selected?.isBionic ? BIONIC_REASON : undefined}
          onSelect={() => selected && onEdit({ type: 'cloneDuplicant', id: selected.id })}
        >
          <Copy /> Clone {selected?.name ?? 'duplicant'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
