import { useVirtualizer } from '@tanstack/react-virtual'
import { Telescope } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { engineNotice, type SeedResult } from '@/seed/result'
import type { SeedRule } from '@/seed/rules'
import { rankResults } from './rank-results'
import { ResultCard } from './result-card'
import { ResultDetails } from './result-details'

interface Props {
  results: SeedResult[]
  rules: SeedRule[]
}

/** A ranked, virtualised list of seed results with a big view for the one clicked. */
export function SeedResults({ results, rules }: Props) {
  const ranked = useMemo(() => rankResults(results), [results])
  const scroller = useRef<HTMLDivElement>(null)
  const [openCode, setOpenCode] = useState<string>()
  const openIndex = ranked.findIndex((r) => r.coordinate === openCode)
  const virtual = useVirtualizer({
    count: ranked.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => 240,
    gap: 8,
    overscan: 4,
    getItemKey: (i) => ranked[i]!.coordinate,
  })

  if (ranked.length === 0) {
    return (
      <EmptyState
        icon={Telescope}
        title="No seeds yet"
        description="Set your rules and start a search. Matching seeds appear here as they are found."
      />
    )
  }
  const notice = ranked[0]!.notice || engineNotice(ranked[0]!.engineBuild)
  return (
    <div className="flex flex-col gap-2">
      <p className="type-caption text-muted-foreground">{notice}</p>
      <div
        ref={scroller}
        className="max-h-[75vh] min-h-64 overflow-y-auto"
        data-testid="seed-results"
      >
        <div className="relative w-full" style={{ height: virtual.getTotalSize() }}>
          {virtual.getVirtualItems().map((row) => (
            <div
              key={row.key}
              ref={virtual.measureElement}
              data-index={row.index}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${row.start}px)` }}
            >
              <ResultCard
                rank={row.index + 1}
                result={ranked[row.index]!}
                rules={rules}
                onOpen={() => setOpenCode(ranked[row.index]!.coordinate)}
              />
            </div>
          ))}
        </div>
      </div>
      <ResultDetails
        rank={openIndex + 1}
        result={ranked[openIndex]}
        rules={rules}
        onClose={() => setOpenCode(undefined)}
      />
    </div>
  )
}
