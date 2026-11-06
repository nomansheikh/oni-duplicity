import { memo } from 'react'
import { DlcBadges } from '@/components/dlc-badge'
import { Badge } from '@/components/ui/badge'
import type { SeedResult } from '@/seed/result'
import type { SeedRule } from '@/seed/rules'
import { AsteroidSummary } from './asteroid-summary'
import { resultDlcs } from './labels'
import { MiniMap } from './mini-map'
import { ResultActions } from './result-actions'
import { RuleLists } from './rule-lists'

interface Props {
  rank: number
  result: SeedResult
  rules: SeedRule[]
  onOpen: () => void
}

/** One ranked result: the map opens the big view; the actions work in place. */
export const ResultCard = memo(function ResultCard({ rank, result, rules, onOpen }: Props) {
  return (
    <article className="flex flex-col gap-3 border border-ink bg-well p-3 sm:flex-row">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${result.coordinate} in the big view`}
        className="shrink-0 self-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <MiniMap asteroids={result.asteroids} />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <header className="flex flex-wrap items-center gap-2">
          <span className="type-h3 text-gold tabular-nums">#{rank}</span>
          <Badge variant="good">
            {result.score} / {result.maxScore}
          </Badge>
          <code className="type-caption min-w-0 truncate font-mono text-muted-foreground">
            {result.coordinate}
          </code>
          <DlcBadges ids={resultDlcs(result)} />
        </header>
        <div className="flex flex-col gap-2">
          {result.asteroids.slice(0, 3).map((a) => (
            <AsteroidSummary key={a.id} asteroid={a} />
          ))}
          {result.asteroids.length > 3 && (
            <button
              type="button"
              onClick={onOpen}
              className="type-caption self-start text-gold hover:underline"
            >
              +{result.asteroids.length - 3} more asteroids
            </button>
          )}
        </div>
        <RuleLists rules={rules} matched={result.matched} missed={result.missed} limit={3} />
        <ResultActions coordinate={result.coordinate} />
      </div>
    </article>
  )
})
