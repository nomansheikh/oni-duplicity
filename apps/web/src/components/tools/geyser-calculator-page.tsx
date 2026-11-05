import { useState } from 'react'
import { geyserTypes } from '@oni-duplicity/game-data'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { fmt, humanize } from '@/lib/format'
import {
  coverRatio,
  coverages,
  fmtC,
  geyserOutput,
  turbinesForPeak,
  type Coverage,
} from '@/lib/tools/geyser-calc'
import type { GeyserView } from '@/worker/model'
import { parseDemand } from '@/lib/tools/parse'
import { PageHeader } from '@/components/page-header'
import { Stat } from './tool-header'

/** Read only: nothing here edits the save. */
export function GeyserCalculatorPage({ geysers }: { geysers: GeyserView[] }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Geyser calculator"
        description="Average output over each geyser's whole activity cycle, and what it can supply. Enter a demand to see whether it is covered. Geyser Control and Geotuner changes are not counted."
      />
      {geysers.length === 0 ? (
        <p className="type-small text-muted-foreground">This save has no geysers.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {geysers.map((g) => (
            <GeyserCalcCard key={g.id} geyser={g} />
          ))}
        </div>
      )}
    </div>
  )
}

function GeyserCalcCard({ geyser: g }: { geyser: GeyserView }) {
  const type = geyserTypes.find((t) => `GeyserGeneric_${t.id}` === g.prefab)
  const out = geyserOutput(g)
  const rows = type
    ? coverages(
        { element: type.element, outputTemperatureK: type.outputTemperature },
        out.averageKgPerSecond,
      )
    : []
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="items-center">
        <CardTitle className="min-w-0 flex-1">{g.name}</CardTitle>
        <Badge variant="geyser" className="shrink-0">
          {g.typeName}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Average" value={`${fmt(out.averageKgPerSecond, 2)} kg/s`} />
          <Stat label="Per cycle" value={`${fmt(out.averageKgPerCycle, 0)} kg`} />
          <Stat label="While erupting" value={`${fmt(out.peakKgPerSecond, 2)} kg/s`} />
          <Stat
            label="Temperature"
            value={type ? fmtC(type.outputTemperature) : 'Unknown'}
            hint={type ? humanize(type.element) : undefined}
          />
        </div>
        <Progress
          variant="task"
          value={Math.round(out.duty * 100)}
          label="Spewing"
          state={`${fmt(out.duty * 100, 1)} % of the time`}
          aria-label="Share of time erupting"
        />
        {rows.length === 0 ? (
          <p className="type-small text-muted-foreground">
            {type
              ? 'No conversion for this output is cited from the game files yet.'
              : 'This geyser type is not known to Duplicity.'}
          </p>
        ) : (
          rows.map((row) => <CoverageRow key={row.id} row={row} peak={out.peakKgPerSecond} />)
        )}
      </CardContent>
    </Card>
  )
}

function CoverageRow({ row, peak }: { row: Coverage; peak: number }) {
  const [text, setText] = useState('')
  const demand = parseDemand(text)
  const ratio = row.blocked ? undefined : coverRatio(row.supply, demand)
  return (
    <div className="flex flex-col gap-2 border border-ink bg-well p-3">
      <div className="type-label">{row.label}</div>
      {row.blocked ? (
        <p className="type-small text-warn">{row.blocked}</p>
      ) : (
        <div className="type-h3 tabular-nums">
          {fmt(row.supply, row.unit === 'W' ? 0 : 1)} {row.unit}
        </div>
      )}
      <p className="type-caption text-muted-foreground">
        {row.chain}. Source: {row.cite}.
      </p>
      {row.id.startsWith('steam') && !row.blocked && (
        <p className="type-caption text-muted-foreground">
          Keeping up while erupting takes {turbinesForPeak(peak)} turbines.
        </p>
      )}
      <label className="flex items-center gap-2 type-small">
        <span className="shrink-0">Demand</span>
        <Input
          type="number"
          min={0}
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label={`Demand in ${row.unit} for ${row.label}`}
          className="w-28 text-right tabular-nums"
        />
        <span className="text-muted-foreground">{row.unit}</span>
      </label>
      {ratio !== undefined && (
        <Progress
          variant="bar"
          tone={ratio >= 1 ? 'good' : ratio >= 0.5 ? 'warn' : 'bad'}
          value={Math.min(100, ratio * 100)}
          label={ratio >= 1 ? 'Covered' : 'Short'}
          state={`${fmt(ratio * 100, 0)} % of demand`}
          aria-label="Share of the demand covered"
        />
      )}
    </div>
  )
}
