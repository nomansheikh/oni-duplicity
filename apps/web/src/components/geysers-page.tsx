import { useState } from 'react'
import { Flame } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { Edit, GeyserView, WorldView } from '@/worker/model'
import { AsteroidFilter } from './asteroid-filter'
import { asteroidName } from '@/lib/asteroid'
import { PageHeader } from './page-header'
import { EmptyState } from './empty-state'
import { GeyserCard } from './geysers/geyser-card'
import { GeyserSheet } from './geysers/geyser-sheet'

export function GeysersPage({
  geysers,
  worlds,
  onEdit,
}: {
  geysers: GeyserView[]
  worlds: WorldView[]
  onEdit: (edit: Edit) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [asteroid, setAsteroid] = useState('all')
  const open = geysers.find((g) => g.id === openId) ?? null
  const visible = geysers.filter((g) => asteroid === 'all' || g.asteroid === asteroid)

  return (
    <>
      <PageHeader
        title="Geysers, vents and volcanoes"
        description="Rate is per second while erupting; average spreads a cycle's output over dormancy. Open a geyser to change its output and timing."
        actions={<AsteroidFilter worlds={worlds} value={asteroid} onChange={setAsteroid} />}
        summary={[
          {
            label: 'Geysers',
            value: visible.length,
            hint: visible.length === geysers.length ? undefined : `of ${geysers.length}`,
          },
        ]}
      />
      <Card>
        <CardContent>
          {visible.length === 0 && (
            <EmptyState
              icon={Flame}
              title="No geysers"
              description={
                geysers.length === 0
                  ? 'This save has no geysers, vents or volcanoes. The ground is calm.'
                  : 'No geysers on this asteroid. Nothing is about to erupt here.'
              }
              action={
                geysers.length > 0
                  ? { label: 'Show all asteroids', onClick: () => setAsteroid('all') }
                  : undefined
              }
              data-testid="geysers-empty"
            />
          )}
          <div
            role="table"
            aria-label="Geysers"
            className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3"
          >
            {visible.map((g) => (
              <GeyserCard
                key={g.id}
                geyser={g}
                asteroid={asteroidName(worlds, g.asteroid)}
                onEdit={onEdit}
                onOpen={() => setOpenId(g.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
      <GeyserSheet geyser={open} onClose={() => setOpenId(null)} onEdit={onEdit} />
    </>
  )
}
