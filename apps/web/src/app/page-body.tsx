import type { ReactNode } from 'react'
import { TabsContent } from '@/components/ui/tabs'
import type { Page } from '@/lib/nav'
import { cn } from '@/lib/utils'

const BODY = 'flex flex-1 flex-col bg-field p-3 md:p-5'
const INNER = 'flex w-full flex-1 flex-col gap-4 md:gap-6'

/**
 * Content width per page, configured in one place. `readable` caps and centres the content on wide
 * screens; `full` lets data-heavy pages use the whole width. The header and tab strip are always
 * full width.
 */
const PAGE_WIDTH: Record<Page, 'readable' | 'full'> = {
  overview: 'readable',
  difficulty: 'readable',
  research: 'readable',
  stories: 'readable',
  content: 'readable',
  space: 'readable',
  asteroids: 'readable',
  'geyser-calculator': 'readable',
  'ranching-calculator': 'readable',
  map: 'full',
  raw: 'full',
  resources: 'full',
  critters: 'full',
  duplicants: 'full',
  geysers: 'full',
  'skill-planner': 'full',
}

/** Pages sit in the tab panel once a save is open, so each tab names a real panel. */
export function Body({ page, children }: { page: Page | null; children: ReactNode }) {
  const inner = (
    <div className={cn(INNER, page && PAGE_WIDTH[page] === 'readable' && 'mx-auto max-w-content')}>
      {children}
    </div>
  )
  return page ? (
    <TabsContent value={page} className={BODY}>
      {inner}
    </TabsContent>
  ) : (
    <div className={BODY}>{inner}</div>
  )
}
