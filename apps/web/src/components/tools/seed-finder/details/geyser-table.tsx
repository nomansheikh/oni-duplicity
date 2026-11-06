import { findElement } from '@oni-duplicity/game-data'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmt, toCelsius } from '@/lib/format'
import { geyserName } from '@/lib/seed-draw/geyser-marks'
import { SECONDS_PER_CYCLE } from '@/lib/tools/geyser-calc'
import { geyserStats } from '@/seed/details/geyser-stats'
import type { DetailGeyser } from '@/seed/details/types'
import { fmtRate } from './format-rate'

// Cells wrap instead of running off the edge of a narrow dialog.
const CELL = 'whitespace-normal align-top'
const HEAD = 'whitespace-normal align-bottom'

function Sub({ children }: { children: React.ReactNode }) {
  return <div className="type-caption text-muted-foreground">{children}</div>
}

/** The geysers of an asteroid with what their rolls give. Oil reservoirs are not geysers. */
export function GeyserTable({ geysers }: { geysers: DetailGeyser[] }) {
  const rows = geysers
    .map((geyser) => ({ geyser, stats: geyserStats(geyser) }))
    .sort((a, b) => geyserName(a.geyser.type).localeCompare(geyserName(b.geyser.type)))
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="type-h3">Geysers</h3>
      {rows.length === 0 ? (
        <p className="type-small text-muted-foreground">No geysers on this asteroid.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={HEAD}>Geyser</TableHead>
              <TableHead className={HEAD}>Emits</TableHead>
              <TableHead className={`${HEAD} text-right`}>Erupting</TableHead>
              <TableHead className={`${HEAD} text-right`}>Average</TableHead>
              <TableHead className={HEAD}>Eruption</TableHead>
              <TableHead className={HEAD}>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ geyser, stats }, i) => (
              <TableRow key={i}>
                <TableCell className={CELL}>
                  {geyserName(geyser.type)}
                  <Sub>
                    Cell {geyser.x}, {geyser.y}
                  </Sub>
                </TableCell>
                {stats ? (
                  <>
                    <TableCell className={CELL}>
                      {findElement(stats.element)?.name ?? stats.element}
                      <Sub>at {fmt(toCelsius(stats.outputTemperatureK), 0)} °C</Sub>
                    </TableCell>
                    <TableCell className={`${CELL} text-right`}>
                      {fmtRate(stats.peakKgPerSecond)}
                    </TableCell>
                    <TableCell className={`${CELL} text-right`}>
                      {fmtRate(stats.averageKgPerSecond)}
                      <Sub>{fmt(stats.averageKgPerCycle, 0)} kg/cycle</Sub>
                    </TableCell>
                    <TableCell className={CELL}>
                      {fmt(stats.eruptionSeconds, 0)} s
                      <Sub>of every {fmt(stats.eruptionPeriodSeconds, 0)} s</Sub>
                    </TableCell>
                    <TableCell className={CELL}>
                      {fmt(stats.activeCycles, 1)} cycles
                      <Sub>then {fmt(stats.dormantCycles, 1)} dormant</Sub>
                    </TableCell>
                  </>
                ) : (
                  <TableCell colSpan={5} className={`${CELL} text-muted-foreground`}>
                    The generator rolled no stats for this geyser.
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="type-caption text-muted-foreground">
        One cycle is {SECONDS_PER_CYCLE} s. Average output counts dormant periods too.
      </p>
    </section>
  )
}
