import { useCallback, useEffect, useState } from 'react'
import { describeSeed, SeedUnavailableError } from '@/seed/details/describe-seed'
import type { SeedDetail } from '@/seed/details/types'

export type DetailState =
  | { status: 'loading' }
  | { status: 'ready'; detail: SeedDetail }
  /** `permanent`: no retry will help; the seed cannot be previewed. */
  | { status: 'error'; message: string; permanent: boolean }

const LOADING: DetailState = { status: 'loading' }

/** Regenerates a seed in full when the view opens; `retry` runs it again after a failure. */
export function useSeedDetail(coordinate: string): { state: DetailState; retry: () => void } {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<{ key: string; state: DetailState }>()
  const key = `${coordinate}#${attempt}`

  useEffect(() => {
    let current = true
    describeSeed(coordinate).then(
      (detail) => current && setSettled({ key, state: { status: 'ready', detail } }),
      (error: unknown) =>
        current &&
        setSettled({
          key,
          state: {
            status: 'error',
            message: error instanceof Error ? error.message : 'Could not generate this seed',
            permanent: error instanceof SeedUnavailableError,
          },
        }),
    )
    return () => {
      current = false
    }
  }, [coordinate, key])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { state: settled?.key === key ? settled.state : LOADING, retry }
}
