import { LoadError, LoadingSave, OpenSave } from '@/components/load-states'
import type { State } from '@/app/types'

/** What the page area shows before a save is open: the load screen, progress or the error. */
export function StartScreen({
  state,
  onFile,
  onPick,
}: {
  state: State
  onFile: (file: File) => void
  onPick: () => void
}) {
  if (state.status === 'idle') return <OpenSave onFile={onFile} onPick={onPick} />
  if (state.status === 'loading') {
    return <LoadingSave fileName={state.fileName} progress={state.progress} />
  }
  if (state.status === 'error') return <LoadError info={state.info} onPick={onPick} />
  return null
}
