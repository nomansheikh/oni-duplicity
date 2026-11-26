import { useState } from 'react'
import { PackagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { fmtMass, toCelsius } from '@/lib/format'
import type { Edit, MaterialView } from '@/worker/model'
import { MAX_CHUNK_MASS, MAX_KELVIN, MAX_SPAWN_MASS } from '@/worker/spawn-limits'

/** Spawns loose chunks of a material at the printing pod. */
export function SpawnPanel({
  material,
  onEdit,
}: {
  material: MaterialView
  onEdit: (edit: Edit) => Promise<void>
}) {
  const [mass, setMass] = useState('')
  const [celsius, setCelsius] = useState('')
  const defaultCelsius = Math.round(toCelsius(material.temperature) * 10) / 10
  const kg = Number(mass)
  const kelvin = (celsius === '' ? defaultCelsius : Number(celsius)) + 273.15
  const massOk = mass !== '' && kg > 0 && kg <= MAX_SPAWN_MASS
  const tempOk = Number.isFinite(kelvin) && kelvin > 0 && kelvin <= MAX_KELVIN
  const chunks = massOk ? Math.ceil(kg / MAX_CHUNK_MASS) : 0
  const refused = material.spawnRefusal

  return (
    <Field>
      <FieldLabel htmlFor="spawn-mass">Spawn at the printing pod</FieldLabel>
      <div className="flex flex-wrap gap-2">
        <InputGroup className="min-w-36 flex-1">
          <InputGroupInput
            id="spawn-mass"
            type="number"
            min={0}
            max={MAX_SPAWN_MASS}
            placeholder="1000"
            aria-label="Mass to spawn"
            disabled={!!refused}
            value={mass}
            onChange={(e) => setMass(e.target.value)}
          />
          <InputGroupAddon align="inline-end">kg</InputGroupAddon>
        </InputGroup>
        <InputGroup className="min-w-32 flex-1">
          <InputGroupInput
            type="number"
            placeholder={String(defaultCelsius)}
            aria-label="Temperature of the spawned items"
            disabled={!!refused}
            value={celsius}
            onChange={(e) => setCelsius(e.target.value)}
          />
          <InputGroupAddon align="inline-end">°C</InputGroupAddon>
        </InputGroup>
        <Button
          variant="outline"
          disabled={!!refused || !massOk || !tempOk}
          onClick={() => {
            void onEdit({ type: 'spawnDebris', elementId: material.id, mass: kg, kelvin })
            setMass('')
            setCelsius('')
          }}
        >
          <PackagePlus /> Spawn
        </Button>
      </div>
      <FieldDescription>
        {refused ??
          (chunks > 1
            ? `Dropped as ${chunks} chunks of ${fmtMass(kg / chunks)}; the game keeps at most ${fmtMass(MAX_CHUNK_MASS)} in one.`
            : `Up to ${fmtMass(MAX_SPAWN_MASS)} at once, dropped as loose debris on the pod's floor. Experimental: not yet checked in game.`)}
      </FieldDescription>
    </Field>
  )
}
