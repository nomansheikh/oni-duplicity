import { LoadError, LoadingSave } from '@/components/load-states'
import { OpenSave } from '@/components/open-save'
import { StartTools } from '@/components/start-tools'
import type { Page } from '@/lib/nav'
import type { State } from '@/app/types'

/** What the page area shows before a save is open: the load screen and tools, progress or the error. */
export function StartScreen({
  state,
  onFile,
  onPick,
  onNavigate,
}: {
  state: State
  onFile: (file: File) => void
  onPick: () => void
  onNavigate: (page: Page) => void
}) {
  if (state.status === 'idle') {
    return (
      <div className="flex flex-col gap-4">
        <OpenSave onFile={onFile} onPick={onPick} />
        <StartTools onNavigate={onNavigate} />
      </div>
    )
  }
  if (state.status === 'loading') {
    return <LoadingSave fileName={state.fileName} progress={state.progress} />
  }
  if (state.status === 'error') return <LoadError info={state.info} onPick={onPick} />
  return null
}
