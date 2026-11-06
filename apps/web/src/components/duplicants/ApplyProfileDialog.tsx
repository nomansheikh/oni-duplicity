import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { blockedSections, modelLabel, profileModel } from '@/lib/profile'
import type { DuplicantProfile, DuplicantView, ProfileSection } from '@/worker/model'

const SECTIONS: { id: ProfileSection; label: string }[] = [
  { id: 'traits', label: 'Traits' },
  { id: 'interests', label: 'Interests' },
  { id: 'attributes', label: 'Attributes' },
  { id: 'skills', label: 'Skills and experience' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'name', label: 'Name and gender' },
]

const DEFAULT_SECTIONS: ProfileSection[] = [
  'traits',
  'interests',
  'attributes',
  'skills',
  'appearance',
]

export function ApplyProfileDialog({
  dupe,
  pending,
  onClose,
  onApply,
}: {
  dupe: DuplicantView
  pending: DuplicantProfile | null
  onClose: () => void
  onApply: (profile: DuplicantProfile, sections: ProfileSection[]) => void
}) {
  const [sections, setSections] = useState<ProfileSection[]>(DEFAULT_SECTIONS)
  // Traits, interests, skills and appearance differ between standard and bionic duplicants.
  const blocked = pending ? blockedSections(pending, dupe.model) : []
  const chosen = sections.filter((s) => !blocked.includes(s))

  return (
    <Dialog open={pending !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Apply {pending?.name} to {dupe.name}?
          </DialogTitle>
          <DialogDescription>
            Choose what to copy over. You can undo this afterwards.
          </DialogDescription>
        </DialogHeader>
        {pending && blocked.length > 0 && (
          <Alert variant="warning" data-testid="model-mismatch">
            <TriangleAlert />
            <AlertTitle>
              {pending.name} is a {modelLabel(profileModel(pending))} duplicant
            </AlertTitle>
            <AlertDescription>
              <p>
                {dupe.name} is {modelLabel(dupe.model)}, so traits, interests, skills and appearance
                are not copied. Name and attributes still can be.
              </p>
            </AlertDescription>
          </Alert>
        )}
        <FieldGroup className="gap-3">
          {SECTIONS.map((section) => (
            <Field key={section.id} orientation="horizontal">
              <Checkbox
                id={`section-${section.id}`}
                disabled={blocked.includes(section.id)}
                checked={chosen.includes(section.id)}
                onCheckedChange={(checked) =>
                  setSections((current) =>
                    checked ? [...current, section.id] : current.filter((s) => s !== section.id),
                  )
                }
              />
              <FieldLabel htmlFor={`section-${section.id}`} className="type-body">
                {section.label}
              </FieldLabel>
            </Field>
          ))}
        </FieldGroup>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={chosen.length === 0}
            onClick={() => {
              if (pending) onApply(pending, chosen)
              onClose()
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
