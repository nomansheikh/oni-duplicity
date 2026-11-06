import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Page } from '@/lib/nav'
import type { Edit } from '@/worker/model'
import type { Loaded } from './types'

// Pages load on first visit so opening the app only pulls in the shell.
const AsteroidsPage = lazy(() =>
  import('@/components/asteroids-page').then((m) => ({ default: m.AsteroidsPage })),
)
const CrittersPage = lazy(() =>
  import('@/components/critters-page').then((m) => ({ default: m.CrittersPage })),
)
const GeyserCalculatorPage = lazy(() =>
  import('@/components/tools/geyser-calculator-page').then((m) => ({
    default: m.GeyserCalculatorPage,
  })),
)
const RanchingCalculatorPage = lazy(() =>
  import('@/components/tools/ranching-calculator-page').then((m) => ({
    default: m.RanchingCalculatorPage,
  })),
)
const SkillPlannerPage = lazy(() =>
  import('@/components/tools/skill-planner-page').then((m) => ({ default: m.SkillPlannerPage })),
)
const DlcPage = lazy(() => import('@/components/dlc-page').then((m) => ({ default: m.DlcPage })))
const DuplicantsPage = lazy(() =>
  import('@/components/duplicants/DuplicantsPage').then((m) => ({ default: m.DuplicantsPage })),
)
const GeysersPage = lazy(() =>
  import('@/components/geysers-page').then((m) => ({ default: m.GeysersPage })),
)
const MaterialsPage = lazy(() =>
  import('@/components/materials-page').then((m) => ({ default: m.MaterialsPage })),
)
const MapPage = lazy(() => import('@/components/map-page').then((m) => ({ default: m.MapPage })))
const OverviewPage = lazy(() =>
  import('@/components/overview-page').then((m) => ({ default: m.OverviewPage })),
)
const RawPage = lazy(() => import('@/components/raw-page').then((m) => ({ default: m.RawPage })))
const ResearchPage = lazy(() =>
  import('@/components/research-page').then((m) => ({ default: m.ResearchPage })),
)
const SettingsPage = lazy(() =>
  import('@/components/settings-page').then((m) => ({ default: m.SettingsPage })),
)
const StoriesPage = lazy(() =>
  import('@/components/stories-page').then((m) => ({ default: m.StoriesPage })),
)
const SpacePage = lazy(() =>
  import('@/components/space-page').then((m) => ({ default: m.SpacePage })),
)

function PageFallback() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
    </div>
  )
}

export function PageRouter({
  loaded,
  page,
  revision,
  selectedId,
  onSelect,
  onEdit,
}: {
  loaded: Loaded | null
  page: Page
  revision: number
  selectedId: string | undefined
  onSelect: (id: string) => void
  onEdit: (edit: Edit) => Promise<void>
}) {
  const edit = onEdit
  return (
    <Suspense fallback={<PageFallback />}>
      {loaded && page === 'overview' && (
        <OverviewPage
          summary={loaded.summary}
          duplicants={loaded.views.duplicants}
          geysers={loaded.views.geysers}
          onEdit={edit}
        />
      )}
      {loaded && page === 'duplicants' && (
        <DuplicantsPage
          duplicants={loaded.views.duplicants}
          catalogs={loaded.catalogs}
          selectedId={selectedId}
          onSelect={onSelect}
          onEdit={edit}
        />
      )}
      {loaded && page === 'geysers' && (
        <GeysersPage geysers={loaded.views.geysers} worlds={loaded.views.worlds} onEdit={edit} />
      )}
      {loaded && page === 'critters' && (
        <CrittersPage critters={loaded.views.critters} worlds={loaded.views.worlds} onEdit={edit} />
      )}
      {loaded && page === 'research' && <ResearchPage techs={loaded.views.techs} onEdit={edit} />}
      {loaded && page === 'space' && (
        <SpacePage destinations={loaded.views.destinations} revision={revision} onEdit={edit} />
      )}
      {loaded && page === 'asteroids' && (
        <AsteroidsPage worlds={loaded.views.worlds} onEdit={edit} />
      )}
      {loaded && page === 'geyser-calculator' && (
        <GeyserCalculatorPage geysers={loaded.views.geysers} />
      )}
      {loaded && page === 'ranching-calculator' && (
        <RanchingCalculatorPage critters={loaded.views.critters} />
      )}
      {loaded && page === 'skill-planner' && (
        <SkillPlannerPage duplicants={loaded.views.duplicants} />
      )}
      {loaded && page === 'stories' && <StoriesPage stories={loaded.views.stories} />}
      {loaded && page === 'content' && <DlcPage revision={revision} onEdit={edit} />}
      {loaded && page === 'difficulty' && (
        <SettingsPage settings={loaded.views.gameSettings} onEdit={edit} />
      )}
      {loaded && page === 'map' && <MapPage worlds={loaded.views.worlds} revision={revision} />}
      {loaded && page === 'raw' && <RawPage revision={revision} onEdit={edit} />}
      {loaded && page === 'resources' && (
        <MaterialsPage materials={loaded.views.materials} revision={revision} onEdit={edit} />
      )}
    </Suspense>
  )
}
