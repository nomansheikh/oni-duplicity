import { Monitor, Moon, Settings, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export function PreferencesDialog({
  allowUnverified,
  onAllowUnverified,
}: {
  allowUnverified: boolean
  onAllowUnverified: (value: boolean) => void
}) {
  const { theme, setTheme } = useTheme()
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Preferences">
          <Settings />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>Stored in this browser only.</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Theme</FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              value={theme}
              onValueChange={(value) => value && setTheme(value)}
              className="w-fit"
            >
              <ToggleGroupItem value="light">
                <Sun /> Light
              </ToggleGroupItem>
              <ToggleGroupItem value="dark">
                <Moon /> Dark
              </ToggleGroupItem>
              <ToggleGroupItem value="system">
                <Monitor /> System
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
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
