import { useMemo, useState } from 'react'
import { Package, Search, SearchX, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { fmt, fmtMass, toCelsius } from '@/lib/format'
import type { Edit, MaterialView } from '@/worker/model'
import { EmptyState } from './empty-state'
import { MaterialSheet } from './materials/material-sheet'
import { Amount, StateBadge } from './materials/state-badge'
import { PageHeader } from './page-header'

export function MaterialsPage({
  materials,
  revision,
  onEdit,
}: {
  materials: MaterialView[]
  revision: number
  onEdit: (edit: Edit) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const visible = useMemo(
    () =>
      materials.filter(
        (m) =>
          (state === 'all' || m.state === state) &&
          `${m.name} ${m.id}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [materials, query, state],
  )
  const open = materials.find((m) => m.id === openId) ?? null

  return (
    <>
      <PageHeader
        title="Resources"
        description="Loose debris and stored contents per element. Open an element to edit mass and temperature."
        actions={
          <>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              aria-label="Filter by state"
              value={state}
              onValueChange={(v) => setState(v || 'all')}
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="Solid">Solid</ToggleGroupItem>
              <ToggleGroupItem value="Liquid">Liquid</ToggleGroupItem>
              <ToggleGroupItem value="Gas">Gas</ToggleGroupItem>
            </ToggleGroup>
            <InputGroup className="w-56">
              <InputGroupInput
                placeholder="Search elements"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </InputGroup>
          </>
        }
      />
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Element</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Loose</TableHead>
                <TableHead className="text-right">Stored</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Avg. temperature</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={materials.length === 0 ? Package : SearchX}
                      title={materials.length === 0 ? 'No resources' : 'No such element'}
                      description={
                        materials.length === 0
                          ? 'No loose or stored resources in this save. The colony is bare.'
                          : 'No element matches those filters. The periodic table shrugs.'
                      }
                      action={
                        materials.length > 0
                          ? {
                              label: 'Clear filters',
                              onClick: () => {
                                setQuery('')
                                setState('all')
                              },
                            }
                          : undefined
                      }
                      data-testid="materials-empty"
                    />
                  </TableCell>
                </TableRow>
              )}
              {visible.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="type-label tracking-normal normal-case">{m.name}</TableCell>
                  <TableCell>
                    <StateBadge state={m.state} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Amount mass={m.looseMass} count={m.looseCount} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Amount mass={m.storedMass} count={m.storedCount} />
                  </TableCell>
                  <TableCell className="text-right font-bold text-good-hi tabular-nums">
                    {fmtMass(m.looseMass + m.storedMass)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(toCelsius(m.temperature), 1)} °C
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setOpenId(m.id)}>
                      <SlidersHorizontal /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <MaterialSheet
        material={open}
        revision={revision}
        onClose={() => setOpenId(null)}
        onEdit={onEdit}
      />
    </>
  )
}
