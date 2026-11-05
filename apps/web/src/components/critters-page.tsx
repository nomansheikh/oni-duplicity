import { useMemo, useState } from 'react'
import { Rabbit, Search, SearchX } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CritterView, Edit, WorldView } from '@/worker/model'
import { CritterRow } from './critters/CritterRow'
import { CritterSheet } from './critters/CritterSheet'
import { AsteroidFilter } from './asteroid-filter'
import { PageHeader } from './page-header'
import { EmptyState } from './empty-state'

export function CrittersPage({
  critters,
  worlds,
  onEdit,
}: {
  critters: CritterView[]
  worlds: WorldView[]
  onEdit: (edit: Edit) => void
}) {
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('all')
  const [asteroid, setAsteroid] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const families = useMemo(() => [...new Set(critters.map((c) => c.family))].sort(), [critters])
  const visible = critters.filter(
    (c) =>
      (family === 'all' || c.family === family) &&
      (asteroid === 'all' || c.asteroid === asteroid) &&
      `${c.name} ${c.prefab}`.toLowerCase().includes(query.toLowerCase()),
  )
  const open = critters.find((c) => c.id === openId) ?? null

  return (
    <>
      <PageHeader
        title="Critters"
        description={`${critters.length} critters across ${families.length} families. Tame, clone, delete or tune their stats.`}
        actions={
          <>
            <AsteroidFilter worlds={worlds} value={asteroid} onChange={setAsteroid} />
            <Select value={family} onValueChange={setFamily}>
              <SelectTrigger className="w-44" aria-label="Family">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All families</SelectItem>
                {families.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InputGroup className="w-56">
              <InputGroupInput
                placeholder="Search critters"
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
                <TableHead>Critter</TableHead>
                <TableHead>Asteroid</TableHead>
                <TableHead>Wildness</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Calories</TableHead>
                <TableHead>Health</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={critters.length === 0 ? Rabbit : SearchX}
                      title={critters.length === 0 ? 'No critters' : 'No critters here'}
                      description={
                        critters.length === 0
                          ? 'Not a single critter in this save. Awfully quiet in the ranch.'
                          : asteroid !== 'all' && !query && family === 'all'
                            ? 'No critters on this asteroid. Maybe they are all hiding.'
                            : 'No critter matches those filters. Try a wider net.'
                      }
                      action={
                        critters.length > 0
                          ? {
                              label: 'Clear filters',
                              onClick: () => {
                                setQuery('')
                                setFamily('all')
                                setAsteroid('all')
                              },
                            }
                          : undefined
                      }
                      data-testid="critters-empty"
                    />
                  </TableCell>
                </TableRow>
              )}
              {visible.map((c) => (
                <CritterRow
                  key={c.id}
                  critter={c}
                  worlds={worlds}
                  onEdit={onEdit}
                  onOpen={setOpenId}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <CritterSheet critter={open} onClose={() => setOpenId(null)} onEdit={onEdit} />
    </>
  )
}
