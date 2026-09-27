import { useRef, useState } from 'react'
import { ClipboardCopy, ClipboardPaste, Download, EllipsisVertical, Upload } from 'lucide-react'
import { toast } from 'sonner'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { toProfile } from '@/lib/format'
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

function isProfile(value: unknown): value is DuplicantProfile {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { format?: unknown }).format === 'duplicity-duplicant@1'
  )
}

export function ProfileActions({
  dupe,
  clipboard,
  onCopy,
  onApply,
}: {
  dupe: DuplicantView
  clipboard: DuplicantProfile | null
  onCopy: (profile: DuplicantProfile) => void
  onApply: (profile: DuplicantProfile, sections: ProfileSection[]) => void
}) {
  const [pending, setPending] = useState<DuplicantProfile | null>(null)
  const [sections, setSections] = useState<ProfileSection[]>(DEFAULT_SECTIONS)
  const importInput = useRef<HTMLInputElement>(null)

  const copy = async () => {
    const profile = toProfile(dupe)
    onCopy(profile)
    try {
      await navigator.clipboard.writeText(JSON.stringify(profile, null, 2))
    } catch {
      // The in-app clipboard still works without clipboard permission.
    }
    toast.success(`Copied ${dupe.name}`, {
      description: 'Paste onto another duplicant from its menu.',
    })
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(toProfile(dupe), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${dupe.name}.duplicant.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const importJson = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isProfile(parsed)) throw new Error('This file is not a Duplicity duplicant export.')
      setPending(parsed)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Duplicant actions">
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={copy}>
            <ClipboardCopy /> Copy profile
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!clipboard}
            onSelect={() => clipboard && setPending(clipboard)}
          >
            <ClipboardPaste /> Paste {clipboard ? `from ${clipboard.name}` : 'profile'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={exportJson}>
            <Download /> Export as JSON
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => importInput.current?.click()}>
            <Upload /> Import from JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={importInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void importJson(file)
          e.target.value = ''
        }}
      />
      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Apply {pending?.name} to {dupe.name}?
            </DialogTitle>
            <DialogDescription>
              Choose what to copy over. You can undo this afterwards.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-3">
            {SECTIONS.map((section) => (
              <Field key={section.id} orientation="horizontal">
                <Checkbox
                  id={`section-${section.id}`}
                  checked={sections.includes(section.id)}
                  onCheckedChange={(checked) =>
                    setSections((current) =>
                      checked ? [...current, section.id] : current.filter((s) => s !== section.id),
                    )
                  }
                />
                <FieldLabel htmlFor={`section-${section.id}`} className="font-normal">
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
              disabled={sections.length === 0}
              onClick={() => {
                if (pending) onApply(pending, sections)
                setPending(null)
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
