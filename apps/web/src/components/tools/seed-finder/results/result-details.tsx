import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { SeedResult } from '@/seed/result'
import type { SeedRule } from '@/seed/rules'
import { DetailsActions } from '../details/details-actions'
import { SeedDetails } from '../details/seed-details'

interface Props {
  rank: number
  result: SeedResult | undefined
  rules: SeedRule[]
  onClose: () => void
}

/** The big view: the seed regenerated in full, with a tab per asteroid, the starmap and the rules. */
export function ResultDetails({ rank, result, rules, onClose }: Props) {
  return (
    <Dialog open={result !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[min(56rem,calc(100vh-2rem))] grid-rows-[auto_minmax(0,1fr)] sm:max-w-[min(1280px,calc(100vw-2rem))]">
        {result && (
          <>
            <DialogHeader>
              <DialogTitle>
                #{rank} · {result.score} / {result.maxScore}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-3 font-mono">
                {result.coordinate}
                <DetailsActions coordinate={result.coordinate} />
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto bg-panel p-4">
              <SeedDetails
                key={result.coordinate}
                coordinate={result.coordinate}
                outcome={{
                  rules,
                  matched: result.matched,
                  missed: result.missed,
                  notice: result.notice,
                }}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
