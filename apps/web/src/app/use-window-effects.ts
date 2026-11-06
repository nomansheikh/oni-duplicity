import { useEffect } from 'react'

/** Undo/redo shortcuts, the unsaved-changes marker in the title and the leave-page warning. */
export function useWindowEffects({
  loaded,
  edits,
  confirmOpen,
  undo,
  redo,
}: {
  loaded: boolean
  edits: number
  confirmOpen: boolean
  undo: () => Promise<void>
  redo: () => Promise<void>
}) {
  useEffect(() => {
    if (!loaded) return
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
  }, [loaded, confirmOpen, undo, redo])

  useEffect(() => {
    document.title = `${edits > 0 ? '• ' : ''}Duplicity · ONI save editor`
  }, [edits])

  useEffect(() => {
    if (edits === 0) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [edits])
}
