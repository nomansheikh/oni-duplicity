import { Loader2, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fmt } from '@/lib/format'
import type { SeedLimit } from '@/lib/tools/seed-limit'
import type { SeedProgress, SeedSearchSummary } from '@/seed/search-types'
import { SeedLimitField } from './seed-limit-field'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="type-caption text-muted-foreground uppercase">{label}</dt>
      <dd className="type-h3 tabular-nums">{value}</dd>
    </div>
  )
}

/** How a finished run ended, in one line. */
function endLine(summary: SeedSearchSummary): string | null {
  const counts = `tried ${fmt(summary.generated, 0)} seeds, ${fmt(summary.matched, 0)} matches.`
  if (summary.reason === 'done') return `Done: ${counts}`
  if (summary.reason === 'stopped') return `Stopped: ${counts}`
  return null
}

/**
 * The seed limit, Find and Stop, the blocker that stops a search, the progress readout and how
 * the last run ended.
 */
export function SearchControls({
  running,
  blocker,
  progress,
  summary,
  maxSeeds,
  runLimit,
  onMaxSeeds,
  onFind,
  onStop,
}: {
  running: boolean
  blocker: string | null
  progress: SeedProgress | null
  summary: SeedSearchSummary | null
  /** The limit the next Find uses. */
  maxSeeds: SeedLimit
  /** The limit of the run the progress belongs to. */
  runLimit: SeedLimit
  onMaxSeeds: (value: SeedLimit) => void
  onFind: () => void
  onStop: () => void
}) {
  const tried = progress && fmt(progress.generated, 0)
  const end = summary && endLine(summary)
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <SeedLimitField value={maxSeeds} disabled={running} onChange={onMaxSeeds} />
      <div className="flex items-center gap-2">
        <Button variant="accent" disabled={running || blocker !== null} onClick={onFind}>
          {running ? <Loader2 className="animate-spin" /> : <Play />} Find
        </Button>
        <Button variant="outline" disabled={!running} onClick={onStop}>
          <Square /> Stop
        </Button>
      </div>
      {blocker && !running && <p className="type-small text-muted-foreground">{blocker}</p>}
      {progress && (
        <dl className="flex gap-6" aria-label="Search progress" data-testid="seed-progress">
          <Stat
            label="Seeds tried"
            value={runLimit === null ? tried! : `${tried} / ${fmt(runLimit, 0)}`}
          />
          <Stat label="Matches" value={fmt(progress.matched, 0)} />
          <Stat label="Seeds / s" value={fmt(progress.seedsPerSecond, 1)} />
        </dl>
      )}
      {end && !running && (
        <p role="status" className="type-small text-muted-foreground">
          {end}
        </p>
      )}
      {summary?.reason === 'error' && (
        <p role="alert" className="type-small text-bad">
          The search failed: {summary.error}
        </p>
      )}
    </div>
  )
}
