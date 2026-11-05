import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmt, humanize } from '@/lib/format'
import { saveClient } from '@/lib/save-client'
import type { BionicOverview } from '@/worker/bionic'
import { Nothing, Panel } from './tabs'

// Mirrors `Electrobank.capacity` and `RemoteWorkerCapacitor.CAPACITY_J` (see worker/bionic.ts).
// Not imported: that module's runtime values would pull the worker code into the page bundle.
const BANK_CAPACITY_J = 120000

const boosterName = (prefab: string) => humanize(prefab.replace(/^Booster_/, ''))

const bankState = (prefab: string) =>
  prefab === 'EmptyElectrobank' ? 'Empty' : prefab === 'GarbageElectrobank' ? 'Spent' : 'Charged'

function Charge({ joules, capacity }: { joules: number; capacity: number }) {
  return (
    <div className="flex items-center gap-3">
      <Progress value={Math.min(100, (joules / capacity) * 100)} className="h-1.5 w-32" />
      <span className="font-mono text-xs tabular-nums">
        {capacity >= 1000 ? `${fmt(joules / 1000, 1)} kJ` : `${fmt(joules, 1)} J`}
      </span>
    </div>
  )
}

export function BionicTab({ dupeId }: { dupeId: string }) {
  const [overview, setOverview] = useState<BionicOverview | null>(null)
  useEffect(() => {
    let live = true
    void saveClient.bionics().then((o) => live && setOverview(o))
    return () => {
      live = false
    }
  }, [])

  const view = overview?.duplicants.find((d) => d.id === dupeId)
  if (!overview || !view) return null
  const slots = Array.from({ length: view.slotCount }, (_, i) => i + 1)
  const docks = new Map(overview.remoteDocks.map((d) => [d.id, d]))

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Panel
        title="Boosters"
        description={`Installed boosters by slot. ${view.unlockedSlots} of ${view.slotCount} slots are unlocked by learned skills. Read only.`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Slot</TableHead>
              <TableHead>Booster</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slots.map((slot) => {
              const booster = view.boosters.find((b) => b.slot === slot)
              const locked = slot > view.unlockedSlots
              return (
                <TableRow key={slot}>
                  <TableCell className="font-mono tabular-nums">{slot}</TableCell>
                  <TableCell>
                    {booster ? (
                      <span className="flex items-center gap-2">
                        {boosterName(booster.prefab)}
                        <Badge variant="outline" className="font-mono">
                          {booster.prefab}
                        </Badge>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{locked ? 'Locked' : 'Empty'}</span>
                    )}
                    {booster && locked && (
                      <Badge variant="destructive" className="ml-2">
                        Locked slot
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Panel>

      <Panel
        title="Electrobanks"
        description={`Banks in this duplicant's battery storage: ${view.electrobanks?.length ?? '?'} of ${view.batteryCapacity} places used. A full bank holds ${fmt(BANK_CAPACITY_J / 1000, 0)} kJ.`}
      >
        {view.internalBattery && (
          <div className="mb-4 space-y-1.5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">Internal battery</span>
              <span className="font-mono tabular-nums">
                {fmt(view.internalBattery.charge / 1000, 1)} /{' '}
                {fmt(view.internalBattery.max / 1000, 0)} kJ
              </span>
            </div>
            <Progress
              value={Math.min(100, (view.internalBattery.charge / view.internalBattery.max) * 100)}
              className="h-1.5"
            />
          </div>
        )}
        {view.electrobanks === null ? (
          <Nothing
            title="Battery storage not recognised"
            description="The storage expected to hold the banks contains something else, so nothing is shown."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Place</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Charge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(
                { length: Math.max(view.batteryCapacity, view.electrobanks.length) },
                (_, i) => {
                  const bank = view.electrobanks![i]
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-mono tabular-nums">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {bank?.prefab ?? <span className="text-muted-foreground">Empty place</span>}
                      </TableCell>
                      <TableCell>{bank ? bankState(bank.prefab) : ''}</TableCell>
                      <TableCell>
                        {!bank || bank.charge === null ? (
                          <span className="text-muted-foreground">{bank ? 'None' : ''}</span>
                        ) : (
                          <Charge joules={bank.charge} capacity={BANK_CAPACITY_J} />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                },
              )}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Panel
        title="Remote workers"
        description="Colony-wide, not tied to this duplicant. Each worker holds 60 J."
      >
        {overview.remoteWorkers.length === 0 ? (
          <Nothing
            title="No remote workers"
            description="This save has no remote worker docks or workers."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dock</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Charge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.remoteWorkers.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    {(w.dockId && docks.get(w.dockId)?.name) || w.dockId || (
                      <span className="text-muted-foreground">No dock</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {w.docked === null ? '' : w.docked ? 'Docked' : 'Out working'}
                  </TableCell>
                  <TableCell>
                    {w.charge === null ? (
                      <span className="text-muted-foreground">Unknown</span>
                    ) : (
                      <Charge joules={w.charge} capacity={w.capacity} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  )
}
