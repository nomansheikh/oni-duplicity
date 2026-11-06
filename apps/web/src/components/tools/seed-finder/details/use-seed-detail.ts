import { useCallback, useEffect, useState } from 'react'
import { describeSeed, SeedUnsupportedError } from '@/seed/details/describe-seed'
import type { SeedDetail } from '@/seed/details/types'

export type DetailState =
  | { status: 'loading' }
  | { status: 'ready'; detail: SeedDetail }
  /** `unsupported`: no retry will help; the coordinate is outside what the generator makes. */
  | { status: 'error'; message: string; unsupported: boolean }

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
            unsupported: error instanceof SeedUnsupportedError,
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
