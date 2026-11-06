import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AppFooter } from '@/components/app-footer'
import { AppTabs } from '@/components/app-sidebar'
import { SaveDialog } from '@/components/save-dialog'
import { SiteHeader } from '@/components/site-header'
import { useDirtyPages } from '@/hooks/use-dirty-pages'
import { entryPage, firstPages, groupOf, shownPage, type GroupId, type Page } from '@/lib/nav'
import { describeLoadError } from '@/lib/load-error'
import { useAllowUnverified } from '@/lib/preferences'
import { loadSave, saveClient } from '@/lib/save-client'
import type { Catalogs, Edit } from '@/worker/model'
import { downloadCurrentSave } from '@/app/download-save'
import { headerFile, tabCounts } from '@/app/derive'
import { fetchViews } from '@/app/fetch-views'
import { HeaderActions } from '@/app/header-actions'
import { Body } from '@/app/page-body'
import { PageRouter } from '@/app/page-router'
import { SaveFileInput } from '@/app/save-file-input'
import { SaveNotices } from '@/app/save-notices'
import { StartScreen } from '@/app/start-screen'
import { NO_EDITS, type EditStatus, type State, type Views } from '@/app/types'
import { useWindowEffects } from '@/app/use-window-effects'

export default function App() {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [views, setViews] = useState<Views | null>(null)
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null)
  const [editStatus, setEditStatus] = useState<EditStatus>(NO_EDITS)
  const [page, setPage] = useState<Page>('overview')
  // Each group opens on the sub-tab it was last left on.
  const [lastPage, setLastPage] = useState(firstPages)
  const [selectedDupe, setSelectedDupe] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [revision, setRevision] = useState(0)
  const dirty = useDirtyPages(editStatus.edits, revision)
  const fileInput = useRef<HTMLInputElement>(null)
  const [allowUnverified, setAllowUnverified] = useAllowUnverified()
  const refresh = useCallback(async () => {
    const { summary, views } = await fetchViews()
    setState({ status: 'loaded', summary })
    setViews(views)
    setRevision((r) => r + 1)
  }, [])

  const navigate = useCallback((next: Page) => {
    setPage(next)
    setLastPage((last) => ({ ...last, [groupOf(next).id]: next }))
  }, [])
  const selectGroup = (group: GroupId) =>
    setPage(entryPage(group, lastPage[group], state.status === 'loaded'))

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
      navigate('overview')
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
      await downloadCurrentSave()
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

  useWindowEffects({
    loaded: state.status === 'loaded',
    edits: editStatus.edits,
    confirmOpen,
    undo,
    redo,
  })

  const loaded =
    state.status === 'loaded' && views && catalogs
      ? { summary: state.summary, views, catalogs }
      : null
  const selected = views?.duplicants.find((d) => d.id === selectedDupe) ?? views?.duplicants[0]
  const saveLocked = loaded?.summary.unverified === true && !allowUnverified
  const pick = () => fileInput.current?.click()
  const shown = shownPage(page, loaded !== null)

  const actions = (
    <HeaderActions
      summary={loaded?.summary ?? null}
      editStatus={editStatus}
      revision={revision}
      saving={saving}
      saveLocked={saveLocked}
      allowUnverified={allowUnverified}
      onAllowUnverified={setAllowUnverified}
      onUndo={undo}
      onRedo={redo}
      onDownload={() => setConfirmOpen(true)}
      onPick={pick}
    />
  )

  return (
    <div className="min-h-svh bg-inset">
      <div className="mx-auto flex min-h-svh w-full max-w-[100rem] flex-col border-x border-edge/40 bg-ground">
        <SiteHeader
          file={loaded ? headerFile(loaded.summary) : null}
          actions={actions}
          onOpen={pick}
          onClose={close}
        />
        <AppTabs
          page={shown}
          saveOpen={loaded !== null}
          onNavigate={navigate}
          onSelectGroup={selectGroup}
          dirty={dirty}
          counts={loaded ? tabCounts(loaded.views) : {}}
        >
          <main className="@container/main flex flex-1 flex-col p-2 sm:p-3">
            <div className="panel flex flex-1 flex-col bg-field p-1">
              <Body page={shown}>
                {!shown && (
                  <StartScreen state={state} onFile={open} onPick={pick} onNavigate={navigate} />
                )}
                {loaded && <SaveNotices summary={loaded.summary} />}
                <PageRouter
                  loaded={loaded}
                  page={page}
                  revision={revision}
                  selectedId={selected?.id}
                  onSelect={setSelectedDupe}
                  onEdit={edit}
                />
              </Body>
            </div>
          </main>
          <AppFooter />
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
        <SaveFileInput ref={fileInput} onFile={(file) => void open(file)} />
      </div>
    </div>
  )
}
