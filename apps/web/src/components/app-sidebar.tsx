import type { ReactNode } from 'react'
import {
  Braces,
  Droplets,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  Map as MapIcon,
  Package,
  Rabbit,
  Rocket,
  Users,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type Page =
  | 'overview'
  | 'map'
  | 'duplicants'
  | 'critters'
  | 'geysers'
  | 'materials'
  | 'research'
  | 'space'
  | 'settings'
  | 'raw'

/** Each page keeps one category colour (design.md section 4), shown on its tab icon. */
const PAGES: { id: Page; title: string; icon: ReactNode; color: string }[] = [
  { id: 'overview', title: 'Overview', icon: <LayoutDashboard />, color: 'var(--cat-oxygen)' },
  { id: 'map', title: 'World map', icon: <MapIcon />, color: 'var(--cat-solid)' },
  { id: 'duplicants', title: 'Duplicants', icon: <Users />, color: 'var(--pink)' },
  { id: 'critters', title: 'Critters', icon: <Rabbit />, color: 'var(--cat-critter)' },
  { id: 'geysers', title: 'Geysers', icon: <Droplets />, color: 'var(--cat-geyser)' },
  { id: 'materials', title: 'Materials', icon: <Package />, color: 'var(--cat-metal)' },
  { id: 'research', title: 'Research', icon: <FlaskConical />, color: 'var(--cat-plant)' },
  { id: 'space', title: 'Space', icon: <Rocket />, color: 'var(--cat-liquid)' },
  { id: 'settings', title: 'Game settings', icon: <Gauge />, color: 'var(--cat-power)' },
  { id: 'raw', title: 'Raw data', icon: <Braces />, color: 'var(--cat-vacuum)' },
]

/**
 * The game's top tab strip. Scrolls sideways when the window is too narrow, so every page
 * stays reachable on a phone.
 */
export function AppTabs({
  page,
  onNavigate,
  counts,
  disabled,
}: {
  page: Page
  onNavigate: (page: Page) => void
  counts: Partial<Record<Page, number>>
  disabled: boolean
}) {
  return (
    <Tabs value={page} onValueChange={(value) => onNavigate(value as Page)} className="gap-0">
      <TabsList aria-label="Pages" className="w-full pb-px [scrollbar-width:thin]">
        {PAGES.map((item) => (
          <TabsTrigger key={item.id} value={item.id} disabled={disabled}>
            <span className="contents" style={{ color: item.color }}>
              {item.icon}
            </span>
            {item.title}
            {counts[item.id] !== undefined && (
              <span data-slot="tab-count" className="tabular-nums">
                {counts[item.id]}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
