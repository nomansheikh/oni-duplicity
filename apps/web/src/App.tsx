import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Download, Moon, Redo2, Sun, Undo2 } from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { AppSidebar, type Page } from '@/components/app-sidebar'
import { DlcBadges } from '@/components/dlc-badge'
import { LoadError, LoadingSave, OpenSave } from '@/components/load-states'
import { PreferencesDialog } from '@/components/preferences-dialog'
import { SiteHeader } from '@/components/site-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAllowUnverified } from '@/lib/preferences'
import { downloadBytes, loadSave, saveClient } from '@/lib/save-client'
import type {
  Catalogs,
  CritterView,
  DestinationView,
  GameSettingView,
  TechView,
  WorldView,
  DuplicantView,
  Edit,
  GeyserView,
  MaterialView,
  Summary,
} from '@/worker/model'

type State =
  | { status: 'idle' }
  | { status: 'loading'; fileName: string; progress: number }
  | { status: 'error'; message: string }
  | { status: 'loaded'; summary: Summary }

interface Views {
  duplicants: DuplicantView[]
  geysers: GeyserView[]
  materials: MaterialView[]
  critters: CritterView[]
  techs: TechView[]
  gameSettings: GameSettingView[]
  worlds: WorldView[]
  destinations: DestinationView[]
}

interface EditStatus {
  edits: number
  canUndo: boolean
  canRedo: boolean
}

// Pages load on first visit so opening the app only pulls in the shell.
const CrittersPage = lazy(() =>
  import('@/components/critters-page').then((m) => ({ default: m.CrittersPage })),
)
const DuplicantsPage = lazy(() =>
  import('@/components/duplicants/DuplicantsPage').then((m) => ({ default: m.DuplicantsPage })),
)
const GeysersPage = lazy(() =>
  import('@/components/geysers-page').then((m) => ({ default: m.GeysersPage })),
)
const MaterialsPage = lazy(() =>
  import('@/components/materials-page').then((m) => ({ default: m.MaterialsPage })),
)
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

const NO_EDITS: EditStatus = { edits: 0, canUndo: false, canRedo: false }

const PAGE_TITLES: Record<Page, string> = {
  overview: 'Overview',
  duplicants: 'Duplicants',
  geysers: 'Geysers',
  materials: 'Materials',
  critters: 'Critters',
  research: 'Research',
  space: 'Space',
  settings: 'Game settings',
  raw: 'Raw data',
}

export default function App() {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [views, setViews] = useState<Views | null>(null)
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null)
  const [editStatus, setEditStatus] = useState<EditStatus>(NO_EDITS)
  const [page, setPage] = useState<Page>('overview')
  const [selectedDupe, setSelectedDupe] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [revision, setRevision] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const [allowUnverified, setAllowUnverified] = useAllowUnverified()
  const { resolvedTheme, setTheme } = useTheme()

  const refresh = useCallback(async () => {
    const [
      summary,
      duplicants,
      geysers,
      materials,
      critters,
      techs,
      gameSettings,
      worlds,
      destinations,
    ] = await Promise.all([
      saveClient.summary(),
      saveClient.duplicants(),
      saveClient.geysers(),
      saveClient.materials(),
      saveClient.critters(),
      saveClient.techs(),
      saveClient.gameSettings(),
      saveClient.worlds(),
      saveClient.destinations(),
    ])
    setState({ status: 'loaded', summary })
    setViews({
      duplicants,
      geysers,
      materials,
      critters,
      techs,
      gameSettings,
      worlds,
      destinations,
    })
    setRevision((r) => r + 1)
  }, [])

  const open = async (file: File) => {
    if (editStatus.edits > 0 && !confirm('Discard your unsaved changes?')) return
    setState({ status: 'loading', fileName: file.name, progress: 0 })
    setViews(null)
    setEditStatus(NO_EDITS)
    setSelectedDupe(undefined)
    try {
      await loadSave(file, (progress) =>
        setState((s) => (s.status === 'loading' ? { ...s, progress } : s)),
      )
      setCatalogs(await saveClient.catalogs())
      await refresh()
      setPage('overview')
    } catch (error) {
      setState({ status: 'error', message: (error as Error).message })
    }
  }

  const run = useCallback(
    async (action: () => Promise<EditStatus>) => {
      try {
        setEditStatus(await action())
        await refresh()
      } catch (error) {
        toast.error((error as Error).message)
      }
    },
    [refresh],
  )

  const edit = (change: Edit) => run(() => saveClient.apply(change))
  const undo = useCallback(() => run(() => saveClient.undo()), [run])
  const redo = useCallback(() => run(() => saveClient.redo()), [run])

  const download = async () => {
    if (state.status !== 'loaded') return
    setSaving(true)
    try {
      downloadBytes(await saveClient.save(), `${state.summary.baseName}.sav`)
      toast.success('Save downloaded', {
        description: 'Back up your original before replacing it.',
      })
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const close = async () => {
    if (editStatus.edits > 0 && !confirm('Discard your unsaved changes?')) return
    await saveClient.close()
    setState({ status: 'idle' })
    setViews(null)
    setEditStatus(NO_EDITS)
  }

  useEffect(() => {
    if (state.status !== 'loaded') return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      if (e.target instanceof HTMLInputElement) return
      e.preventDefault()
      void (e.shiftKey ? redo() : undo())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.status, undo, redo])

  useEffect(() => {
    if (editStatus.edits === 0) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [editStatus.edits])

  const loaded =
    state.status === 'loaded' && views && catalogs
      ? { summary: state.summary, views, catalogs }
      : null
  const selected = views?.duplicants.find((d) => d.id === selectedDupe) ?? views?.duplicants[0]
  const crumbs = loaded
    ? [
        loaded.summary.baseName,
        PAGE_TITLES[page],
        ...(page === 'duplicants' && selected ? [selected.name] : []),
      ]
    : ['Duplicity']

  const themeToggle = (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      >
        {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
      </Button>
      <PreferencesDialog allowUnverified={allowUnverified} onAllowUnverified={setAllowUnverified} />
    </>
  )
  const saveLocked = loaded?.summary.unverified === true && !allowUnverified

  const actions = loaded ? (
    <>
      <DlcBadges ids={loaded.summary.dlcIds} className="hidden xl:flex" />
      {editStatus.edits > 0 && (
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {editStatus.edits} unsaved {editStatus.edits === 1 ? 'edit' : 'edits'}
        </Badge>
      )}
      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Undo"
              onClick={undo}
              disabled={!editStatus.canUndo}
            >
              <Undo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Undo{' '}
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>Z</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Redo"
              onClick={redo}
              disabled={!editStatus.canRedo}
            >
              <Redo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Redo{' '}
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>⇧</Kbd>
              <Kbd>Z</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>
      </ButtonGroup>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button onClick={download} disabled={saving || saveLocked}>
              <Download />
              <span className="hidden sm:inline">{saving ? 'Saving…' : 'Download save'}</span>
            </Button>
          </span>
        </TooltipTrigger>
        {saveLocked && (
          <TooltipContent>
            This save version is unverified. Allow it in Preferences to download.
          </TooltipContent>
        )}
      </Tooltip>
      {themeToggle}
    </>
  ) : (
    themeToggle
  )

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 64)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        page={page}
        onNavigate={setPage}
        counts={
          loaded
            ? {
                duplicants: loaded.views.duplicants.length,
                geysers: loaded.views.geysers.length,
                materials: loaded.views.materials.length,
                critters: loaded.views.critters.length,
                space: loaded.views.worlds.length,
              }
            : {}
        }
        file={loaded ? { name: loaded.summary.fileName, version: loaded.summary.version } : null}
        onOpen={() => fileInput.current?.click()}
        onClose={close}
      />
      <SidebarInset>
        <SiteHeader crumbs={crumbs} actions={actions} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
              {state.status === 'idle' && (
                <OpenSave onFile={open} onPick={() => fileInput.current?.click()} />
              )}
              {state.status === 'loading' && (
                <LoadingSave fileName={state.fileName} progress={state.progress} />
              )}
              {state.status === 'error' && (
                <LoadError message={state.message} onPick={() => fileInput.current?.click()} />
              )}
              {loaded && (loaded.summary.unverified || loaded.summary.warnings.length > 0) && (
                <div className="rounded-lg border border-chart-3/50 bg-chart-3/10 px-4 py-3 text-sm">
                  {loaded.summary.warnings.map((w) => (
                    <p key={w}>{w}</p>
                  ))}
                  {loaded.summary.unverified && (
                    <p>Editing may corrupt this save. Keep a backup.</p>
                  )}
                </div>
              )}
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
                    selectedId={selected?.id}
                    onSelect={setSelectedDupe}
                    onEdit={edit}
                  />
                )}
                {loaded && page === 'geysers' && (
                  <GeysersPage geysers={loaded.views.geysers} onEdit={edit} />
                )}
                {loaded && page === 'critters' && (
                  <CrittersPage critters={loaded.views.critters} onEdit={edit} />
                )}
                {loaded && page === 'research' && (
                  <ResearchPage techs={loaded.views.techs} onEdit={edit} />
                )}
                {loaded && page === 'space' && (
                  <SpacePage
                    worlds={loaded.views.worlds}
                    destinations={loaded.views.destinations}
                    onEdit={edit}
                  />
                )}
                {loaded && page === 'settings' && (
                  <SettingsPage settings={loaded.views.gameSettings} onEdit={edit} />
                )}
                {loaded && page === 'raw' && <RawPage revision={revision} onEdit={edit} />}
                {loaded && page === 'materials' && (
                  <MaterialsPage
                    materials={loaded.views.materials}
                    revision={revision}
                    onEdit={edit}
                  />
                )}
              </Suspense>
            </div>
          </div>
        </div>
      </SidebarInset>
      <input
        ref={fileInput}
        type="file"
        accept=".sav"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void open(file)
          e.target.value = ''
        }}
      />
    </SidebarProvider>
  )
}
