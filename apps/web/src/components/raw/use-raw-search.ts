import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { saveClient } from '@/lib/save-client'
import type { RawSearchResult } from '@/worker/raw'
import { SEARCH_DEBOUNCE, SEARCH_LIMIT } from './types'

export type SearchState =
  | { state: 'idle' }
  | { state: 'running' }
  | ({ state: 'done' } & RawSearchResult)

// Ids never repeat, even across remounts of the page, so a late cancel cannot hit a newer search.
let nextSearchId = 0

export function useRawSearch(revision: number) {
  const [query, setQuery] = useState('')
  const [searchValues, setSearchValues] = useState(false)
  const [search, setSearch] = useState<SearchState>({ state: 'idle' })
  const searchId = useRef(0)

  // Search the whole save in the worker, debounced; a newer query cancels the one in flight.
  useEffect(() => {
    const text = query.trim()
    const id = ++nextSearchId
    searchId.current = id
    if (text.length < 2) {
      setSearch({ state: 'idle' })
      return
    }
    setSearch({ state: 'running' })
    const timer = setTimeout(() => {
      saveClient
        .rawSearch(id, { query: text, values: searchValues, limit: SEARCH_LIMIT })
        .then((result) => {
          if (id === searchId.current) setSearch({ state: 'done', ...result })
        })
        .catch((error: Error) => {
          // A superseded search rejects with "cancelled"; only the latest one may report.
          if (id === searchId.current && error.message !== 'cancelled') {
            setSearch({ state: 'idle' })
            toast.error(error.message)
          }
        })
    }, SEARCH_DEBOUNCE)
    return () => {
      clearTimeout(timer)
      void saveClient.cancelRawSearch(id)
    }
  }, [query, searchValues, revision])

  return { query, setQuery, searchValues, setSearchValues, search }
}
