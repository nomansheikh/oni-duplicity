import { useState } from 'react'
import { FlaskConical, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { GeyserView } from '@/worker/model'

export function TypeChanger({
  geyser,
  onChange,
}: {
  geyser: GeyserView
  onChange: (typeId: string) => void
}) {
  const [typeId, setTypeId] = useState('')
  return (
    <Field>
      <div className="flex flex-col gap-2 border-2 border-warn bg-warn/10 p-3">
        <FieldLabel>
          Type
          <Badge variant="warn" className="gap-1">
            <FlaskConical /> Experimental
          </Badge>
        </FieldLabel>
        <div className="flex gap-2">
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger className="min-w-0 flex-1 basis-48" aria-label="New type">
              <SelectValue placeholder={`Change from ${geyser.typeName}`} />
            </SelectTrigger>
            <SelectContent>
              {geyser.swapTargets.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={!typeId} onClick={() => onChange(typeId)}>
            Change type
          </Button>
        </div>
        <FieldDescription>
          Only types of the same size that your save&apos;s DLCs allow are listed. Output,
          temperature and germs follow the new type and the rolls are kept. Experimental: not yet
          verified in game, so keep a backup.
        </FieldDescription>
        {geyser.hasGeyserControl && (
          <div className="flex gap-2 type-small text-white">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warn" />
            This save uses the Geyser Control mod; it may reapply its own values after the swap.
          </div>
        )}
      </div>
    </Field>
  )
}
