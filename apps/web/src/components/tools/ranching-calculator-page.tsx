import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fmt, fmtMass, humanize } from '@/lib/format'
import {
  STABLE,
  findSpecies,
  herdsFromSave,
  maxCritters,
  planRanch,
  swims,
  type FeedLine,
  type ProductLine,
} from '@/lib/tools/ranching-calc'
import { ranchSpecies } from '@/lib/tools/ranching-data'
import type { CritterView } from '@/worker/model'
import { parseDemand } from '@/lib/tools/parse'
import { PageHeader } from '@/components/page-header'
import { Stat } from './tool-header'

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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{fish ? 'Pond space' : 'Stable space'}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Space per critter" value={`${species.spacePerCritter} cells`} />
              {fish ? (
                <Stat label="Pond cells needed" value={fmt(plan.space.needed, 0)} />
              ) : (
                <>
                  <Stat
                    label={`Most in one stable (${STABLE.maxCells} cells)`}
                    value={String(capacity)}
                  />
                  <Stat label="Cells needed" value={fmt(plan.space.needed, 0)} />
                  <Stat label="Stables" value={String(plan.space.stables)} />
                </>
              )}
            </div>
            {!fish && (
              <Progress
                variant="bar"
                tone={plan.space.fitsOneStable ? 'good' : 'bad'}
                value={Math.min(100, (plan.space.needed / STABLE.maxCells) * 100)}
                label={plan.space.fitsOneStable ? 'Fits one stable' : 'Needs more than one stable'}
                state={`${fmt(plan.space.needed, 0)} of ${STABLE.maxCells} cells`}
                aria-label="Share of a full stable used"
              />
            )}
            <p className="type-caption text-muted-foreground">
              {fish
                ? 'Fish count against the water they swim in, not a stable: the pond needs this many cells (FishOvercrowingManager, BasePacuConfig.cs). Each fish, baby or adult, takes its own space.'
                : `Each critter, baby or adult, takes its own space in the room. A stable is ${STABLE.minCells} to ${STABLE.maxCells} cells and needs a ranching building. Over capacity, every critter beyond it costs 1 happiness; eggs that would overfill the room stop egg laying. Source: ${STABLE.cite.join(', ')}, OvercrowdingMonitor.cs.`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rancher time</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {fish ? (
              <p className="type-small">
                The grooming station skips swimming critters, so there is no rancher time to plan
                for fish. Source: RanchStationConfig.cs.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Work per cycle" value={`${fmt(plan.rancherSeconds, 0)} s`} />
                  <Stat label="Ranchers" value={String(plan.ranchers)} />
                </div>
                <p className="type-caption text-muted-foreground">
                  A visit takes 12 s per critter and lasts 600 s, plus 10 % per Ranching point.
                  Walking and the schedule are not counted, so treat it as a minimum. Source:
                  RanchStationConfig.cs, ModifierSet.cs.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feed per cycle</CardTitle>
            <CardDescription>
              {fmt(species.caloriesPerCycle / 1000, 0)} kcal per critter per cycle
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {plan.feed.map((line, i) => (
              <FeedRow key={i} line={line} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Output</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {plan.eggsPerCycle !== undefined && (
              <div className="grid grid-cols-2 gap-2">
                <Stat
                  label="Eggs per cycle"
                  value={fmt(plan.eggsPerCycle, 2)}
                  hint={`one per ${species.egg?.fertilityCycles} cycles each`}
                />
                {plan.shellKgPerCycle !== undefined && (
                  <Stat label="Shell per cycle" value={fmtMass(plan.shellKgPerCycle)} />
                )}
              </div>
            )}
            {plan.products.map((p, i) => (
              <ProductRow key={i} product={p} />
            ))}
          </CardContent>
        </Card>
      </div>
      <p className="type-caption text-muted-foreground">
        Sources: {species.cite.join(', ')}, TUNING/CREATURES.cs.
      </p>
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

function FeedRow({ line }: { line: FeedLine }) {
  const eats =
    line.eats.length > 4
      ? `${line.eats.slice(0, 4).map(humanize).join(', ')} and more`
      : line.eats.map(humanize).join(', ')
  return (
    <div className="border border-ink bg-well p-3">
      <div className="type-small">{eats}</div>
      <div className="type-h3 tabular-nums">
        {line.kgPerCycle !== undefined
          ? fmtMass(line.kgPerCycle)
          : `${fmt(line.caloriesPerCycle / 1000, 0)} kcal`}
      </div>
      {line.produces && (
        <div className="type-caption text-muted-foreground">
          Leaves {fmtMass(line.produces.kgPerCycle)} of {humanize(line.produces.item)}
        </div>
      )}
      {line.note && <div className="type-caption text-muted-foreground">{line.note}</div>}
    </div>
  )
}

function ProductRow({ product }: { product: ProductLine }) {
  return (
    <div className="border border-ink bg-well p-3">
      <div className="type-label">{humanize(product.item)}</div>
      <div className="type-h3 tabular-nums">
        {product.perCycle !== undefined
          ? `${fmt(product.perCycle, product.perCycle < 1 ? 3 : 1)} per cycle`
          : product.onDeathKg !== undefined
            ? `${fmtMass(product.onDeathKg)} per critter on death`
            : ''}
      </div>
      <div className="type-caption text-muted-foreground">{product.note}</div>
    </div>
  )
}
