import { Download, FolderOpen, Redo2, Undo2 } from 'lucide-react'
import { ChangesPopover } from '@/components/changes-popover'
import { Badge } from '@/components/ui/badge'
import { DlcBadges } from '@/components/dlc-badge'
import { PreferencesDialog } from '@/components/preferences-dialog'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Summary } from '@/worker/model'
import type { EditStatus } from './types'

export function HeaderActions({
  summary,
  editStatus,
  revision,
  saving,
  saveLocked,
  allowUnverified,
  onAllowUnverified,
  onUndo,
  onRedo,
  onDownload,
  onPick,
}: {
  summary: Summary | null
  editStatus: EditStatus
  revision: number
  saving: boolean
  saveLocked: boolean
  allowUnverified: boolean
  onAllowUnverified: (allow: boolean) => void
  onUndo: () => void
  onRedo: () => void
  onDownload: () => void
  onPick: () => void
}) {
  const preferences = (
    <PreferencesDialog allowUnverified={allowUnverified} onAllowUnverified={onAllowUnverified} />
  )
  if (!summary) {
    return (
      <>
        <Button variant="secondary" onClick={onPick}>
          <FolderOpen />
          Open a save
        </Button>
        {preferences}
      </>
    )
  }
  return (
    <>
      {summary.isAutoSave && (
        <Badge variant="outline" className="border-chart-3/50 bg-chart-3/10">
          Autosave
        </Badge>
      )}
      <DlcBadges ids={summary.dlcIds} className="hidden xl:flex" />
      {editStatus.edits > 0 && <ChangesPopover count={editStatus.edits} revision={revision} />}
      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Undo"
              onClick={onUndo}
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
              onClick={onRedo}
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
            <Button onClick={onDownload} disabled={saving || saveLocked}>
              <Download />
              <span className="hidden sm:inline">{saving ? 'Saving…' : 'Download save'}</span>
              {editStatus.edits > 0 && (
                <span
                  data-testid="download-count"
                  aria-hidden
                  className="bg-black/30 px-1.5 type-caption tabular-nums"
                >
                  {editStatus.edits}
                </span>
              )}
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
  )
}
