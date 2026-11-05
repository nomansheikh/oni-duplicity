import { useEffect, useState } from 'react'
import { pageOfEdit, type Page } from '@/lib/nav'
import { saveClient } from '@/lib/save-client'

const NONE: ReadonlySet<Page> = new Set()

/** The pages whose content has unsaved edits, read from the edit history after every change. */
export function useDirtyPages(edits: number, revision: number): ReadonlySet<Page> {
  const [pages, setPages] = useState<ReadonlySet<Page>>(NONE)

  useEffect(() => {
    if (edits === 0) {
      setPages(NONE)
      return
    }
    let cancelled = false
    void saveClient.history().then((entries) => {
      if (cancelled) return
      const next = new Set<Page>()
      for (const entry of entries) {
        const page = pageOfEdit(entry)
        if (page) next.add(page)
      }
      setPages(next)
    })
    return () => {
      cancelled = true
    }
  }, [edits, revision])

  return pages
}
