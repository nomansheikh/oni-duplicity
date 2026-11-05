import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'

export function PreferencesDialog({
  allowUnverified,
  onAllowUnverified,
}: {
  allowUnverified: boolean
  onAllowUnverified: (value: boolean) => void
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Preferences">
          <Settings />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>Stored in this browser only.</DialogDescription>
        </DialogHeader>
        <FieldGroup className="p-4">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="allow-unverified">Allow saving unverified versions</FieldLabel>
              <FieldDescription>
                Saves newer than the versions Duplicity has been tested with open read-only. Turn
                this on to save them anyway, at your own risk.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="allow-unverified"
              checked={allowUnverified}
              onCheckedChange={onAllowUnverified}
            />
          </Field>
          <Field>
            <FieldLabel>Language</FieldLabel>
            <FieldDescription>English. Translations are welcome on GitHub.</FieldDescription>
          </Field>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  )
}
