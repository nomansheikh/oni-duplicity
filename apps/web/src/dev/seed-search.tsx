import { useRef, useState } from 'react'
import { SEED_CLUSTERS } from '@/seed/clusters'
import { SEED_PRESETS } from '@/seed/presets'
import type { SeedResult } from '@/seed/result'
import { createSeedSearch } from '@/seed/search'
import type { SeedProgress, SeedSearch } from '@/seed/search-types'

/** Dev-only page at /?seedtest: runs the seed search engine with a preset and lists the top seeds. */
export default function SeedSearchTest() {
  const search = useRef<SeedSearch>(createSeedSearch())
  const [prefix, setPrefix] = useState('SNDST-C')
  const [presetId, setPresetId] = useState(SEED_PRESETS[0]!.id)
  const [progress, setProgress] = useState<SeedProgress>()
  const [ranking, setRanking] = useState<SeedResult[]>([])
  const [status, setStatus] = useState('idle')

  async function run() {
    const cluster = SEED_CLUSTERS.find((c) => c.prefix === prefix)!
    const preset = SEED_PRESETS.find((p) => p.id === presetId)!
    setRanking([])
    setStatus('running')
    const offResult = search.current.onResult((_, top) => setRanking(top))
    const offProgress = search.current.onProgress(setProgress)
    const summary = await search.current.start(cluster, preset.rules, {
      start: { mode: 'random' },
      top: 10,
      maxSeeds: 60,
    })
    offResult()
    offProgress()
    setStatus(`${summary.reason}${summary.error ? `: ${summary.error}` : ''}`)
  }

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-6 font-mono text-sm">
      <h1 className="text-lg">Seed search (dev)</h1>
      <div className="flex gap-2">
        <select value={prefix} onChange={(e) => setPrefix(e.target.value)} data-testid="cluster">
          {SEED_CLUSTERS.map((c) => (
            <option key={c.prefix} value={c.prefix}>
              {c.prefix} ({c.edition})
            </option>
          ))}
        </select>
        <select value={presetId} onChange={(e) => setPresetId(e.target.value)} data-testid="preset">
          {SEED_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button onClick={run} data-testid="start">
          Start
        </button>
        <button onClick={() => search.current.stop()} data-testid="stop">
          Stop
        </button>
      </div>
      <p data-testid="status">
        {status}
        {progress
          ? ` | generated ${progress.generated}, passed ${progress.matched}, failed ${progress.failed}, ${progress.seedsPerSecond.toFixed(1)}/s`
          : ''}
      </p>
      <ol data-testid="results">
        {ranking.map((r) => (
          <li key={r.coordinate}>
            {r.coordinate} score {r.score}/{r.maxScore} matched [{r.matched.join(', ')}] missed [
            {r.missed.join(', ')}]
          </li>
        ))}
      </ol>
      <p>{ranking[0]?.notice}</p>
    </main>
  )
}
