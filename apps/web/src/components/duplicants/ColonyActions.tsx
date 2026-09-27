import { useState } from 'react'
import { BatteryFull, Dumbbell, GraduationCap, HeartPulse, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldLabel } from '@/components/ui/field'
import type { Edit } from '@/worker/model'
import { NumberField } from '../common'

/** Edits that apply to every duplicant at once; each is a single undo step. */
export function ColonyActions({ onEdit }: { onEdit: (edit: Edit) => void }) {
  const [attributesOpen, setAttributesOpen] = useState(false)
  const [level, setLevel] = useState(10)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Wand2 /> Everyone
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>All duplicants</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => onEdit({ type: 'bulkDuplicants', action: 'relieveStress' })}
          >
            <HeartPulse /> Relieve stress
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onEdit({ type: 'bulkDuplicants', action: 'fillNeeds' })}
          >
            <BatteryFull /> Heal and fill needs
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => onEdit({ type: 'bulkDuplicants', action: 'masterSkills' })}
          >
            <GraduationCap /> Master every skill
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAttributesOpen(true)}>
            <Dumbbell /> Set every attribute…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={attributesOpen} onOpenChange={setAttributesOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set every attribute</DialogTitle>
            <DialogDescription>
              Sets each duplicant&apos;s trained level for every attribute. Traits and skills still
              add their bonuses on top.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>Level</FieldLabel>
            <NumberField label="Level" value={level} min={0} className="w-32" onCommit={setLevel} />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => {
                onEdit({ type: 'bulkDuplicants', action: 'setAttributes', level })
                setAttributesOpen(false)
              }}
            >
              Apply to everyone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
