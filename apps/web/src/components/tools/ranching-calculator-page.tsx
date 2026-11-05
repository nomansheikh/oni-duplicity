import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { humanize } from '@/lib/format'
import {
  STABLE,
  findSpecies,
  herdsFromSave,
  maxCritters,
  planRanch,
  swims,
} from '@/lib/tools/ranching-calc'
import { ranchSpecies } from '@/lib/tools/ranching-data'
import type { CritterView } from '@/worker/model'
import { parseDemand } from '@/lib/tools/parse'
import { PageHeader } from '@/components/page-header'
import { RanchFlow } from './ranching-flow'

const FAMILIES = [...new Set(ranchSpecies.map((s) => s.family))]

/** Read only: nothing here edits the save. */
export function RanchingCalculatorPage({ critters }: { critters: CritterView[] }) {
  const herds = useMemo(() => herdsFromSave(critters), [critters])
  const [speciesId, setSpeciesId] = useState(herds[0]?.species.id ?? 'Hatch')
  const [count, setCount] = useState(String(herds[0]?.count ?? 8))
  const [ranching, setRanching] = useState('0')
  const [seconds, setSeconds] = useState('600')
  const species = findSpecies(speciesId) ?? ranchSpecies[0]!
  const n = Math.floor(parseDemand(count))
  const plan = planRanch(species, n, {
    ranchingAttribute: parseDemand(ranching),
    secondsAvailablePerRancher: parseDemand(seconds),
  })
  const capacity = maxCritters(STABLE.maxCells, species)
  const fish = swims(species)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Ranching calculator"
        description="Pick a species and herd size to see the stable space, feed, output and rancher time it takes. Figures are at the game's standard rates for a healthy herd."
      />
      {herds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>From your save</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {herds.map((h) => (
              <Button
                key={h.species.id}
                variant={h.species.id === speciesId ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSpeciesId(h.species.id)
                  setCount(String(h.count))
                }}
              >
                {h.species.name} x{h.count}
                {h.babies > 0 && ` (${h.babies} baby)`}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Herd</CardTitle>
        </CardHeader>
        <CardContent className="grid items-end gap-4 md:grid-cols-4">
          <Labelled label="Species and morph">
            <Select value={speciesId} onValueChange={setSpeciesId}>
              <SelectTrigger className="w-full" aria-label="Species and morph">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FAMILIES.map((family) => (
                  <SelectGroup key={family}>
                    <SelectLabel>{humanize(family)}</SelectLabel>
                    {ranchSpecies
                      .filter((s) => s.family === family)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </Labelled>
          <Labelled label="Critters">
            <Input
              type="number"
              min={0}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              aria-label="Number of critters"
              className="tabular-nums"
            />
          </Labelled>
          <Labelled label="Rancher's ranching skill" title="Ranching attribute of the rancher">
            <Input
              type="number"
              min={0}
              value={ranching}
              onChange={(e) => setRanching(e.target.value)}
              aria-label="Ranching attribute"
              className="tabular-nums"
            />
          </Labelled>
          <Labelled label="Rancher seconds per cycle">
            <Input
              type="number"
              min={0}
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              aria-label="Seconds of ranching per rancher per cycle"
              className="tabular-nums"
            />
          </Labelled>
        </CardContent>
      </Card>

      <RanchFlow
        species={species}
        plan={plan}
        fish={fish}
        capacity={capacity}
        secondsPerRancher={parseDemand(seconds)}
      />
      <details className="type-caption text-muted-foreground">
        <summary className="cursor-pointer">Sources</summary>
        <p className="mt-1">
          Figures come from the game's own files: {species.cite.join(', ')},{' '}
          {STABLE.cite.join(', ')}, OvercrowdingMonitor.cs, ModifierSet.cs, TUNING/CREATURES.cs.
        </p>
      </details>
    </div>
  )
}

function Labelled({
  label,
  title,
  children,
}: {
  label: string
  title?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1" title={title}>
      <span className="type-label">{label}</span>
      {children}
    </label>
  )
}
