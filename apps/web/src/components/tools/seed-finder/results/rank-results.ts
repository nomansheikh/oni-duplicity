import type { SeedResult } from '@/seed/result'

/** Best score first; ties keep arrival order so streaming doesn't shuffle equal results. */
export function rankResults(results: SeedResult[]): SeedResult[] {
  return results
    .map((result, index) => ({ result, index }))
    .sort((a, b) => b.result.score - a.result.score || a.index - b.index)
    .map(({ result }) => result)
}
