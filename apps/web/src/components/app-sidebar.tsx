import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  FlaskConical,
  Gauge,
  LayoutDashboard,
  Map as MapIcon,
  Rocket,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  GROUPS,
  SAVELESS_GROUPS,
  SAVELESS_PAGES,
  groupOf,
  type GroupId,
  type Page,
} from '@/lib/nav'

export type { Page } from '@/lib/nav'

const ICONS: Record<GroupId, LucideIcon> = {
  overview: LayoutDashboard,
  colony: Users,
  world: MapIcon,
  progress: FlaskConical,
  space: Rocket,
  game: Gauge,
  tools: Wrench,
}

/** A gold dot for a tab that has unsaved edits. */
function DirtyDot({ className }: { className?: string }) {
  return (
    <>
      <span className="sr-only">, unsaved edits</span>
      <span
        aria-hidden
        data-slot="dirty-dot"
        className={cn('size-2 shrink-0 rounded-full bg-gold', className)}
      />
    </>
  )
}

/**
 * The game's top tab strip: one tab per group, and under a group with several pages a row of
 * sub-tabs. `page` is null while no save is open: every tab is disabled and none is active.
 * Both rows wrap the page panel (`TabsContent`) so each tab controls a real panel. The strip
 * scrolls sideways when narrow, with a fade at each edge that has more tabs.
 */
export function AppTabs({
  page,
  saveOpen,
  onNavigate,
  onSelectGroup,
  counts,
  dirty,
  children,
}: {
  page: Page | null
  /** False while no save is open: only the groups and pages that need none are usable. */
  saveOpen: boolean
  /** Open a page directly (a sub-tab). */
  onNavigate: (page: Page) => void
  /** Open a group, on the sub-tab it was last left on. */
  onSelectGroup: (group: GroupId) => void
  counts: Partial<Record<Page, number>>
  dirty: ReadonlySet<Page>
  children: ReactNode
}) {
  const list = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: false, end: false })
  const group = page ? groupOf(page) : null
  const subPages = group?.pages.filter((p) => saveOpen || SAVELESS_PAGES.has(p.id)) ?? []

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
        <Tabs
          value={group?.id ?? ''}
          onValueChange={(value) => onSelectGroup(value as GroupId)}
          className="gap-0"
        >
          <TabsList
            ref={list}
            aria-label="Groups"
            className="w-full pb-px [scrollbar-width:thin]"
            onFocus={(e) => e.target.scrollIntoView({ block: 'nearest', inline: 'nearest' })}
          >
            {GROUPS.map((item) => {
              const Icon = ICONS[item.id]
              return (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  disabled={!saveOpen && !SAVELESS_GROUPS.has(item.id)}
                  className="relative"
                  // The group tabs switch the sub-tab panel below; they have no panel of their own.
                  aria-controls={undefined}
                >
                  <span className="contents" style={{ color: item.color }}>
                    <Icon />
                  </span>
                  {item.title}
                  {item.pages.some((p) => dirty.has(p.id)) && <DirtyDot />}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
        <Fade side="start" show={edges.start} />
        <Fade side="end" show={edges.end} />
      </nav>
      {group && subPages.length > 1 && (
        <div className="border-b border-ink bg-field px-3 py-1.5">
          <TabsList
            variant="line"
            aria-label={`${group.title} pages`}
            className="w-full gap-1 overflow-x-auto [scrollbar-width:thin]"
          >
            {subPages.map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                style={{ '--c': group.color } as CSSProperties}
                className="min-h-7 border-transparent bg-transparent px-3 shadow-none hover:bg-tab data-active:border-ink data-active:bg-inset data-active:text-fg data-active:shadow-[inset_0_-2px_0_var(--c)] data-active:hover:bg-inset"
                // Radix points every tab at its own panel; only the active one is mounted.
                {...(item.id === page ? {} : { 'aria-controls': undefined })}
              >
                {item.title}
                {counts[item.id] !== undefined && (
                  <>
                    <span className="sr-only">, {counts[item.id]}</span>
                    <span data-slot="tab-count" aria-hidden className="tabular-nums">
                      {counts[item.id]}
                    </span>
                  </>
                )}
                {dirty.has(item.id) && <DirtyDot />}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      )}
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
