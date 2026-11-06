import { useEffect, useState } from 'react'
import { SeedResults } from '@/components/tools/seed-finder/results/seed-results'
import { Button } from '@/components/ui/button'
import { FIXTURE_RESULTS, FIXTURE_RULES } from './seed-fixtures'

/** Fixture results (not from the engine) for eyeballing the seed finder results. */
export function SeedResultsSection() {
  const [shown, setShown] = useState(0)
  const [streaming, setStreaming] = useState(false)
  useEffect(() => {
    if (!streaming) return
    const id = setInterval(() => setShown((n) => (n >= 60 ? n : n + 1)), 200)
    return () => clearInterval(id)
  }, [streaming])
  const results = Array.from({ length: shown }, (_, i) => {
    const base = FIXTURE_RESULTS[i % FIXTURE_RESULTS.length]!
    return { ...base, coordinate: `${base.prefix}-${base.seed + i * 7}-0-0-0` }
  })
  return (
    <section className="flex flex-col gap-3">
      <h2 className="type-h2">Seed results (fixtures)</h2>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setShown(3)}>
          Show 3
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setStreaming((s) => !s)}>
          {streaming ? 'Stop streaming' : 'Stream up to 60'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShown(0)
            setStreaming(false)
          }}
        >
          Clear
        </Button>
      </div>
      <SeedResults results={results} rules={FIXTURE_RULES} />
    </section>
  )
}
