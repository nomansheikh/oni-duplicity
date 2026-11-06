import { Loader2, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fmt } from '@/lib/format'
import type { SeedProgress, SeedSearchSummary } from '@/seed/search-types'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="type-caption text-muted-foreground uppercase">{label}</dt>
      <dd className="type-h3 tabular-nums">{value}</dd>
    </div>
  )
}

/** Find and Stop, the blocker that stops a search, and the progress readout. */
export function SearchControls({
  running,
  blocker,
  progress,
  summary,
  onFind,
  onStop,
}: {
  running: boolean
  blocker: string | null
  progress: SeedProgress | null
  summary: SeedSearchSummary | null
  onFind: () => void
  onStop: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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
          <Stat label="Seeds tried" value={fmt(progress.generated, 0)} />
          <Stat label="Matches" value={fmt(progress.matched, 0)} />
          <Stat label="Seeds / s" value={fmt(progress.seedsPerSecond, 1)} />
        </dl>
      )}
      {summary?.reason === 'error' && (
        <p role="alert" className="type-small text-bad">
          The search failed: {summary.error}
        </p>
      )}
    </div>
  )
}
