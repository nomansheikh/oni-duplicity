import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { portraitParts } from '@/lib/format'
import type { DuplicantView } from '@/worker/model'
import { DuplicantAvatar } from '../common'
import { Panel, Nothing, type EditFn } from './panel'

// --- Appearance -------------------------------------------------------------------------------

export function AppearanceTab({ dupe, edit }: { dupe: DuplicantView; edit: EditFn }) {
  return (
    <Panel title="Appearance" description="Styles are numbered as in the game files.">
      {dupe.appearance.length === 0 ? (
        <Nothing
          title="Nothing to change"
          description="This duplicant has no editable appearance."
        />
      ) : (
        <div className="flex flex-col gap-6 @3xl/main:flex-row">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <DuplicantAvatar name={dupe.name} parts={portraitParts(dupe.appearance)} size={160} />
            <span className="type-caption text-muted-foreground">Live preview</span>
          </div>
          <FieldGroup className="grid flex-1 gap-4 @2xl/main:grid-cols-2">
            {dupe.appearance.map((slot) => {
              const id = `${dupe.id}-${slot.slot}`
              return (
                <Field key={slot.slot}>
                  <FieldLabel htmlFor={id}>{slot.label}</FieldLabel>
                  <Select
                    value={slot.current}
                    onValueChange={(number) =>
                      edit({ type: 'setAccessory', slot: slot.slot, number })
                    }
                  >
                    <SelectTrigger id={id} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {slot.options.map((n) => (
                        <SelectItem key={n} value={n}>
                          Style {Number(n)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )
            })}
          </FieldGroup>
        </div>
      )}
    </Panel>
  )
}
