import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Braces,
  Droplets,
  FlaskConical,
  BookOpen,
  Gauge,
  LayoutDashboard,
  Map as MapIcon,
  Package,
  Puzzle,
  Rabbit,
  Rocket,
  Users,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export type Page =
  | 'overview'
  | 'map'
  | 'duplicants'
  | 'critters'
  | 'geysers'
  | 'materials'
  | 'research'
  | 'space'
  | 'stories'
  | 'dlc'
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
  { id: 'stories', title: 'Stories', icon: <BookOpen />, color: 'var(--cat-food)' },
  { id: 'dlc', title: 'DLC', icon: <Puzzle />, color: 'var(--cat-dlc)' },
  { id: 'settings', title: 'Game settings', icon: <Gauge />, color: 'var(--cat-power)' },
  { id: 'raw', title: 'Raw data', icon: <Braces />, color: 'var(--cat-vacuum)' },
]

/**
 * The game's top tab strip, wrapping the page panel (`TabsContent`) so each tab controls a
 * real panel. `page` is null while no save is open: every tab is disabled and none is active.
 * The strip scrolls sideways when narrow, with a fade at each edge that has more tabs.
 */
export function AppTabs({
  page,
  onNavigate,
  counts,
  children,
}: {
  page: Page | null
  onNavigate: (page: Page) => void
  counts: Partial<Record<Page, number>>
  children: ReactNode
}) {
  const list = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: false, end: false })

  useEffect(() => {
    const el = list.current
    if (!el) return
    const update = () =>
      setEdges({
        start: el.scrollLeft > 1,
        end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      })
    update()
    el.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [])

  return (
    <Tabs
      value={page ?? ''}
      onValueChange={(value) => onNavigate(value as Page)}
      className="flex-1 gap-0"
    >
      <nav aria-label="Editor pages" className="relative border-b border-ink bg-ground px-3 pt-2">
        <TabsList
          ref={list}
          aria-label="Pages"
          className="w-full pb-px [scrollbar-width:thin]"
          onFocus={(e) => e.target.scrollIntoView({ block: 'nearest', inline: 'nearest' })}
        >
          {PAGES.map((item) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              disabled={page === null}
              // The screen-reader count is absolutely positioned; keep it inside the tab.
              className="relative"
              // Radix points every tab at its own panel; only the active one is mounted.
              {...(item.id === page ? {} : { 'aria-controls': undefined })}
            >
              <span className="contents" style={{ color: item.color }}>
                {item.icon}
              </span>
              {item.title}
              {counts[item.id] !== undefined && (
                <>
                  <span className="sr-only">, {counts[item.id]}</span>
                  <span data-slot="tab-count" aria-hidden className="tabular-nums">
                    {counts[item.id]}
                  </span>
                </>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        <Fade side="start" show={edges.start} />
        <Fade side="end" show={edges.end} />
      </nav>
      {children}
    </Tabs>
  )
}

function Fade({ side, show }: { side: 'start' | 'end'; show: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute top-2 bottom-0 w-8 transition-opacity',
        side === 'start' ? 'left-3 bg-gradient-to-r' : 'right-3 bg-gradient-to-l',
        'from-ground to-transparent',
        show ? 'opacity-100' : 'opacity-0',
      )}
    />
  )
}
