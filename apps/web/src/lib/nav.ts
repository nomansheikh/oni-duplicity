export type Page =
  | 'overview'
  | 'duplicants'
  | 'critters'
  | 'resources'
  | 'map'
  | 'asteroids'
  | 'geysers'
  | 'research'
  | 'stories'
  | 'space'
  | 'difficulty'
  | 'content'
  | 'raw'
  | 'geyser-calculator'
  | 'ranching-calculator'
  | 'skill-planner'
  | 'seed-finder'

export type GroupId = 'overview' | 'colony' | 'world' | 'progress' | 'space' | 'game' | 'tools'

export interface NavGroup {
  id: GroupId
  title: string
  /** Category colour (design.md section 4), shown on the tab icon. */
  color: string
  pages: { id: Page; title: string }[]
}

/** The top tab strip. A group with more than one page gets a row of sub-tabs. */
export const GROUPS: NavGroup[] = [
  {
    id: 'overview',
    title: 'Overview',
    color: 'var(--cat-oxygen)',
    pages: [{ id: 'overview', title: 'Overview' }],
  },
  {
    id: 'colony',
    title: 'Colony',
    color: 'var(--pink)',
    pages: [
      { id: 'duplicants', title: 'Duplicants' },
      { id: 'critters', title: 'Critters' },
      { id: 'resources', title: 'Resources' },
    ],
  },
  {
    id: 'world',
    title: 'World',
    color: 'var(--cat-solid)',
    pages: [
      { id: 'map', title: 'Map' },
      { id: 'asteroids', title: 'Asteroids' },
      { id: 'geysers', title: 'Geysers' },
    ],
  },
  {
    id: 'progress',
    title: 'Progress',
    color: 'var(--cat-plant)',
    pages: [
      { id: 'research', title: 'Research' },
      { id: 'stories', title: 'Stories' },
    ],
  },
  {
    id: 'space',
    title: 'Space',
    color: 'var(--cat-liquid)',
    pages: [{ id: 'space', title: 'Space' }],
  },
  {
    id: 'game',
    title: 'Game',
    color: 'var(--cat-power)',
    pages: [
      { id: 'difficulty', title: 'Difficulty' },
      { id: 'content', title: 'Content' },
      { id: 'raw', title: 'Raw data' },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    color: 'var(--cat-metal)',
    pages: [
      { id: 'seed-finder', title: 'Seed finder' },
      { id: 'geyser-calculator', title: 'Geyser calculator' },
      { id: 'ranching-calculator', title: 'Ranching calculator' },
      { id: 'skill-planner', title: 'Skill planner' },
    ],
  },
]

/** Pages that work without a save, so they open from the start screen. */
export const SAVELESS_PAGES: ReadonlySet<Page> = new Set<Page>(['seed-finder'])

/** Groups whose tab stays enabled with no save open: Overview (the start screen) and Tools. */
export const SAVELESS_GROUPS: ReadonlySet<GroupId> = new Set<GroupId>(['overview', 'tools'])

/** The page the tabs show: a page that needs a save only counts once one is open. */
export function shownPage(page: Page, saveOpen: boolean): Page | null {
  return saveOpen || SAVELESS_PAGES.has(page) ? page : null
}

/** Where a group opens: its last page, or with no save open, its first page that needs none. */
export function entryPage(group: GroupId, last: Page, saveOpen: boolean): Page {
  if (shownPage(last, saveOpen)) return last
  return GROUPS.find((g) => g.id === group)?.pages.find((p) => SAVELESS_PAGES.has(p.id))?.id ?? last
}

export function groupOf(page: Page): NavGroup {
  return GROUPS.find((g) => g.pages.some((p) => p.id === page))!
}

/** Each group's first page, the starting point of its remembered sub-tab. */
export function firstPages(): Record<GroupId, Page> {
  return Object.fromEntries(GROUPS.map((g) => [g.id, g.pages[0]!.id])) as Record<GroupId, Page>
}

/** The page where an edit can be seen, or undefined when no page shows it. */
export function pageOfEdit(entry: {
  type: string
  category: string
  key: string
}): Page | undefined {
  switch (entry.type) {
    case 'setColonyName':
      return 'overview'
    case 'setSandbox':
    case 'setDebugWasUsed':
      return 'difficulty'
    case 'setDemoliorImpact':
      return 'content'
    case 'setPoiStock':
      return 'space'
  }
  switch (entry.category) {
    case 'setting':
      return 'difficulty'
    case 'duplicant':
      return 'duplicants'
    case 'critter':
      return 'critters'
    case 'geyser':
      return 'geysers'
    case 'research':
      return 'research'
    case 'material':
    case 'item':
      return 'resources'
    case 'asteroid':
      return entry.key === 'starmap' || entry.key.startsWith('destination:') ? 'space' : 'asteroids'
    case 'raw':
      return 'raw'
    default:
      return undefined
  }
}
