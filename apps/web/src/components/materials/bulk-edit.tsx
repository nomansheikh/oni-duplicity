import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { fmt, toCelsius } from '@/lib/format'
import type { Edit, MaterialView } from '@/worker/model'

export function BulkEdit({
  material,
  onEdit,
  temperature,
  setTemperature,
  factor,
  setFactor,
}: {
  material: MaterialView
  onEdit: (edit: Edit) => Promise<void>
  temperature: string
  setTemperature: (value: string) => void
  factor: string
  setFactor: (value: string) => void
}) {
  return (
    <FieldGroup className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="bulk-temp">Set every temperature</FieldLabel>
        <div className="flex gap-2">
          <InputGroup>
            <InputGroupInput
              id="bulk-temp"
              type="number"
              placeholder={fmt(toCelsius(material.temperature), 1)}
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
            />
            <InputGroupAddon align="inline-end">°C</InputGroupAddon>
          </InputGroup>
          <Button
            variant="outline"
            disabled={temperature === '' || !Number.isFinite(Number(temperature))}
            onClick={() => {
              void onEdit({
                type: 'setMaterialTemperature',
                elementId: material.id,
                kelvin: Number(temperature) + 273.15,
              })
              setTemperature('')
            }}
          >
            Apply
          </Button>
        </div>
      </Field>
      <Field>
        <FieldLabel htmlFor="bulk-mass">Multiply every mass</FieldLabel>
        <div className="flex gap-2">
          <InputGroup>
            <InputGroupInput
              id="bulk-mass"
              type="number"
              min={0}
              step={0.1}
              placeholder="2"
              value={factor}
              onChange={(e) => setFactor(e.target.value)}
            />
            <InputGroupAddon align="inline-end">×</InputGroupAddon>
          </InputGroup>
          <Button
            variant="outline"
            disabled={factor === '' || !(Number(factor) >= 0)}
            onClick={() => {
              void onEdit({
                type: 'scaleMaterialMass',
                elementId: material.id,
                factor: Number(factor),
              })
              setFactor('')
            }}
          >
            Apply
          </Button>
        </div>
      </Field>
    </FieldGroup>
  )
}
