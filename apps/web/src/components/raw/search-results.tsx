import { Badge } from '@/components/ui/badge'
import { formatPath } from '@/lib/raw-path'
import type { RawPath } from '@/worker/model'
import type { RawMatch, RawSearchResult } from '@/worker/raw'
import { keyOf, SEARCH_LIMIT } from './types'

const MATCH_LABEL: Record<RawMatch['by'], string> = { key: 'key', path: 'path', value: 'value' }
const MATCH_VARIANT: Record<RawMatch['by'], 'info' | 'warn' | 'good'> = {
  key: 'info',
  path: 'warn',
  value: 'good',
}

/** A path with the last segment (the key itself) in white and the route to it dimmed. */
function PathText({ path }: { path: RawPath }) {
  const full = formatPath(path)
  const last = formatPath(path.slice(-1))
  const split = full.length - last.length
  const tail = full.endsWith(last) ? split : full.length
  return (
    <span className="min-w-0 flex-1 truncate" title={full}>
      <span className="text-fg-2">{full.slice(0, tail)}</span>
      <span className="font-bold text-white">{full.slice(tail)}</span>
    </span>
  )
}

export function SearchResults({
  result,
  onPick,
}: {
  result: RawSearchResult
  onPick: (path: RawPath) => void
}) {
  return (
    <div className="border border-ink bg-inset">
      <div className="flex items-center justify-between gap-3 border-b border-ink bg-field px-3 py-1.5 type-caption text-fg-2">
        <span>
          {result.matches.length === 0
            ? 'No matches in the whole save'
            : `${result.matches.length}${result.truncated ? '+' : ''} match${result.matches.length === 1 ? '' : 'es'}${result.truncated ? ` (showing the first ${SEARCH_LIMIT}, narrow the search)` : ''}`}
        </span>
        <span>
          {result.scanned.toLocaleString()} values in {(result.ms / 1000).toFixed(1)} s
        </span>
      </div>
      {result.matches.length > 0 && (
        <ul className="max-h-56 overflow-auto" aria-label="Search results">
          {result.matches.map((match) => (
            <li key={keyOf(match.path)}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-1.5 text-left font-mono type-small hover:bg-hover-row"
                onClick={() => onPick(match.path)}
              >
                <Badge variant={MATCH_VARIANT[match.by]} className="w-16 shrink-0">
                  {MATCH_LABEL[match.by]}
                </Badge>
                <PathText path={match.path} />
                {match.value !== undefined && (
                  <span className="max-w-64 shrink-0 truncate text-good">{match.value}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
