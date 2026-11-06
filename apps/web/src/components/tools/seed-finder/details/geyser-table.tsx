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
              <TableHead>Geyser</TableHead>
              <TableHead>Emits</TableHead>
              <TableHead className="text-right">Output while erupting</TableHead>
              <TableHead className="text-right">Average output</TableHead>
              <TableHead>Eruption</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Cell</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ geyser, stats }, i) => (
              <TableRow key={i}>
                <TableCell>{geyserName(geyser.type)}</TableCell>
                {stats ? (
                  <>
                    <TableCell>
                      {findElement(stats.element)?.name ?? stats.element}
                      <span className="text-muted-foreground">
                        {' '}
                        at {fmt(toCelsius(stats.outputTemperatureK), 0)} °C
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtRate(stats.peakKgPerSecond)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtRate(stats.averageKgPerSecond)}
                      <span className="text-muted-foreground">
                        {' '}
                        · {fmt(stats.averageKgPerCycle, 0)} kg/cycle
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {fmt(stats.eruptionSeconds, 0)} s of every{' '}
                      {fmt(stats.eruptionPeriodSeconds, 0)} s
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {fmt(stats.activeCycles, 1)} cycles, then {fmt(stats.dormantCycles, 1)}{' '}
                      dormant
                    </TableCell>
                  </>
                ) : (
                  <TableCell colSpan={5} className="text-muted-foreground">
                    The generator rolled no stats for this geyser.
                  </TableCell>
                )}
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {geyser.x}, {geyser.y}
                </TableCell>
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
