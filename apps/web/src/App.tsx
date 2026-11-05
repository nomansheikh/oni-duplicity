import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Download, FolderOpen, Redo2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { AppTabs, type Page } from '@/components/app-sidebar'
import { ChangesPopover } from '@/components/changes-popover'
import { Badge } from '@/components/ui/badge'
import { DlcBadges } from '@/components/dlc-badge'
import { LoadError, LoadingSave, OpenSave } from '@/components/load-states'
import { SaveDialog } from '@/components/save-dialog'
import { PreferencesDialog } from '@/components/preferences-dialog'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Skeleton } from '@/components/ui/skeleton'
import { TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { describeLoadError, type LoadErrorInfo } from '@/lib/load-error'
import { useAllowUnverified } from '@/lib/preferences'
import { downloadBytes, loadSave, saveClient } from '@/lib/save-client'
import type {
  Catalogs,
  CritterView,
  DestinationView,
  GameSettingView,
  TechView,
  StoryView,
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
  | { status: 'error'; info: LoadErrorInfo }
  | { status: 'loaded'; summary: Summary }

interface Views {
  duplicants: DuplicantView[]
  geysers: GeyserView[]
  materials: MaterialView[]
  critters: CritterView[]
  techs: TechView[]
  gameSettings: GameSettingView[]
  worlds: WorldView[]
  stories: StoryView[]
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

const BODY = 'flex flex-1 flex-col bg-field p-3 md:p-5'
const INNER = 'flex w-full flex-1 flex-col gap-4 md:gap-6'

/**
 * Content width per page, configured in one place. `readable` caps and centres the content on wide
 * screens; `full` lets data-heavy pages use the whole width. The header and tab strip are always
 * full width.
 */
const PAGE_WIDTH: Record<Page, 'readable' | 'full'> = {
  overview: 'readable',
  settings: 'readable',
  research: 'readable',
  stories: 'readable',
  dlc: 'readable',
  space: 'readable',
  map: 'full',
  raw: 'full',
  materials: 'full',
  critters: 'full',
  duplicants: 'full',
  geysers: 'full',
}

/** Pages sit in the tab panel once a save is open, so each tab names a real panel. */
function Body({ page, children }: { page: Page | null; children: ReactNode }) {
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

const NO_EDITS: EditStatus = { edits: 0, canUndo: false, canRedo: false }

export default function App() {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [views, setViews] = useState<Views | null>(null)
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null)
  const [editStatus, setEditStatus] = useState<EditStatus>(NO_EDITS)
  const [page, setPage] = useState<Page>('overview')
  const [selectedDupe, setSelectedDupe] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [revision, setRevision] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const [allowUnverified, setAllowUnverified] = useAllowUnverified()

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
      stories,
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
      saveClient.stories(),
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
      stories,
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
      setState({ status: 'error', info: describeLoadError(error) })
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
    if (state.status !== 'loaded' || saving) return
    setConfirmOpen(false)
    setSaving(true)
    try {
      // The worker handles messages in order, so this name includes every edit
      // already sent, even while the views are still refreshing.
      const [bytes, { baseName }] = await Promise.all([saveClient.save(), saveClient.summary()])
      downloadBytes(bytes, `${baseName}.sav`)
      toast.success('Save downloaded')
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
      // The save dialog lists the edits as they are; changing them under it would make it stale.
      if (confirmOpen) return
      if (e.target instanceof HTMLInputElement) return
      e.preventDefault()
      void (e.shiftKey ? redo() : undo())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.status, confirmOpen, undo, redo])

  useEffect(() => {
    document.title = `${editStatus.edits > 0 ? '• ' : ''}Duplicity · ONI save editor`
  }, [editStatus.edits])

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
  const preferences = (
    <PreferencesDialog allowUnverified={allowUnverified} onAllowUnverified={setAllowUnverified} />
  )
  const saveLocked = loaded?.summary.unverified === true && !allowUnverified

  const actions = loaded ? (
    <>
      {loaded.summary.isAutoSave && (
        <Badge variant="outline" className="border-chart-3/50 bg-chart-3/10">
          Autosave
        </Badge>
      )}
      <DlcBadges ids={loaded.summary.dlcIds} className="hidden xl:flex" />
      {editStatus.edits > 0 && <ChangesPopover count={editStatus.edits} revision={revision} />}
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
            <Button onClick={() => setConfirmOpen(true)} disabled={saving || saveLocked}>
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
      {preferences}
    </>
  ) : (
    <>
      <Button variant="secondary" onClick={() => fileInput.current?.click()}>
        <FolderOpen />
        Open a save
      </Button>
      {preferences}
    </>
  )

  return (
    <div className="flex min-h-svh flex-col bg-ground">
      <SiteHeader
        file={
          loaded
            ? {
                name: loaded.summary.fileName,
                colony: loaded.summary.baseName,
                cycle: loaded.summary.cycles,
                version: loaded.summary.version,
              }
            : null
        }
        actions={actions}
        onOpen={() => fileInput.current?.click()}
        onClose={close}
      />
      <AppTabs
        page={loaded ? page : null}
        onNavigate={setPage}
        counts={
          loaded
            ? {
                duplicants: loaded.views.duplicants.length,
                geysers: loaded.views.geysers.length,
                materials: loaded.views.materials.length,
                critters: loaded.views.critters.length,
                space: loaded.views.worlds.length,
                stories: loaded.views.stories.length,
              }
            : {}
        }
      >
        <main className="@container/main flex flex-1 flex-col p-2 sm:p-3">
          <div className="panel flex flex-1 flex-col bg-field p-1">
            <Body page={loaded ? page : null}>
              {state.status === 'idle' && (
                <OpenSave onFile={open} onPick={() => fileInput.current?.click()} />
              )}
              {state.status === 'loading' && (
                <LoadingSave fileName={state.fileName} progress={state.progress} />
              )}
              {state.status === 'error' && (
                <LoadError info={state.info} onPick={() => fileInput.current?.click()} />
              )}
              {loaded?.summary.isAutoSave && (
                <div className="border border-ink bg-warn/15 px-4 py-3 type-small">
                  <p className="font-medium">This is an autosave</p>
                  <p className="text-muted-foreground">
                    The game&apos;s autosave rotation may overwrite an edited autosave
                    {loaded.summary.originalSaveName
                      ? `. It was written from ${loaded.summary.originalSaveName}, so editing that save is safer`
                      : ''}
                    .
                  </p>
                </div>
              )}
              {loaded && (loaded.summary.unverified || loaded.summary.warnings.length > 0) && (
                <div className="border border-ink bg-warn/15 px-4 py-3 type-small">
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
                    revision={revision}
                    onEdit={edit}
                  />
                )}
                {loaded && page === 'stories' && <StoriesPage stories={loaded.views.stories} />}
                {loaded && page === 'dlc' && <DlcPage revision={revision} onEdit={edit} />}
                {loaded && page === 'settings' && (
                  <SettingsPage settings={loaded.views.gameSettings} onEdit={edit} />
                )}
                {loaded && page === 'map' && (
                  <MapPage worlds={loaded.views.worlds} revision={revision} />
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
            </Body>
          </div>
        </main>
      </AppTabs>
      {loaded && (
        <SaveDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          fileName={`${loaded.summary.baseName}.sav`}
          isAutoSave={loaded.summary.isAutoSave}
          originalSaveName={loaded.summary.originalSaveName}
          saving={saving}
          onConfirm={download}
        />
      )}
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
    </div>
  )
}
