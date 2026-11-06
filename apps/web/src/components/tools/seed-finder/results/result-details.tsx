import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { engineNotice, type SeedResult } from '@/seed/result'
import type { SeedRule } from '@/seed/rules'
import { AsteroidCanvas } from './asteroid-canvas'
import { AsteroidSummary } from './asteroid-summary'
import { asteroidLabel } from './labels'
import { ResultActions } from './result-actions'
import { RuleLists } from './rule-lists'

interface Props {
  rank: number
  result: SeedResult | undefined
  rules: SeedRule[]
  onClose: () => void
}

const MAP_WIDTH = 720
const MAP_MAX_HEIGHT = 440

function Body({ rank, result, rules }: { rank: number; result: SeedResult; rules: SeedRule[] }) {
  const start = result.asteroids.find((a) => a.isStart) ?? result.asteroids[0]
  const [active, setActive] = useState(start?.id)
  const asteroid = result.asteroids.find((a) => a.id === active) ?? start
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          #{rank} · {result.score} / {result.maxScore}
        </DialogTitle>
        <DialogDescription className="font-mono">{result.coordinate}</DialogDescription>
      </DialogHeader>
      <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto bg-panel p-4">
        {asteroid && (
          <div className="flex flex-col gap-2">
            {result.asteroids.length > 1 && (
              <Tabs value={asteroid.id} onValueChange={setActive}>
                <TabsList>
                  {result.asteroids.map((a) => (
                    <TabsTrigger key={a.id} value={a.id}>
                      {asteroidLabel(a.id)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
            <div className="max-w-full overflow-x-auto">
              <AsteroidCanvas
                asteroid={asteroid}
                width={Math.min(
                  MAP_WIDTH,
                  Math.round((MAP_MAX_HEIGHT * asteroid.width) / asteroid.height),
                )}
                marker={5}
                interactive
              />
            </div>
            <AsteroidSummary asteroid={asteroid} />
          </div>
        )}
        <section className="flex flex-col gap-1.5">
          <h3 className="type-h3">Rules</h3>
          <RuleLists rules={rules} matched={result.matched} missed={result.missed} />
        </section>
        <ResultActions coordinate={result.coordinate} size="default" />
        <p className="type-caption text-muted-foreground">
          {result.notice || engineNotice(result.engineBuild)}
        </p>
      </div>
    </>
  )
}

/** The big view: a large map with labelled geysers, asteroid tabs and every rule. */
export function ResultDetails({ rank, result, rules, onClose }: Props) {
  return (
    <Dialog open={result !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[min(780px,calc(100vw-2rem))]">
        {result && <Body key={result.coordinate} rank={rank} result={result} rules={rules} />}
      </DialogContent>
    </Dialog>
  )
}
