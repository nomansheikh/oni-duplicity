import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { engineNotice, type SeedResult } from '@/seed/result'
import type { SeedRule } from '@/seed/rules'
import { asteroidLabel } from '../results/labels'
import { RuleLists } from '../results/rule-lists'
import { AsteroidView } from './asteroid-view'
import { StarmapView } from './starmap/starmap-view'
import { useSeedDetail } from './use-seed-detail'

const STARMAP = 'starmap'
const RULES = 'rules'

/** Everything about a seed, generated on demand: its asteroids, starmap and the rules it met. */
export function SeedDetails({ result, rules }: { result: SeedResult; rules: SeedRule[] }) {
  const { state, retry } = useSeedDetail(result.coordinate)
  const start = result.asteroids.find((a) => a.isStart) ?? result.asteroids[0]
  const [tab, setTab] = useState(start?.id ?? RULES)

  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="type-small text-destructive">{state.message}</p>
        <Button variant="secondary" size="sm" onClick={retry}>
          Try again
        </Button>
      </div>
    )
  }
  const detail = state.status === 'ready' ? state.detail : undefined
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="h-auto flex-wrap justify-start">
        {result.asteroids.map((a) => (
          <TabsTrigger key={a.id} value={a.id}>
            {asteroidLabel(a.id)}
          </TabsTrigger>
        ))}
        <TabsTrigger value={STARMAP}>Starmap</TabsTrigger>
        <TabsTrigger value={RULES}>Rules</TabsTrigger>
      </TabsList>
      {result.asteroids.map((a) => {
        const asteroid = detail?.asteroids.find((d) => d.id === a.id)
        return (
          <TabsContent key={a.id} value={a.id}>
            {detail && asteroid ? (
              <AsteroidView key={a.id} detail={detail} asteroid={asteroid} />
            ) : (
              <Loading />
            )}
          </TabsContent>
        )
      })}
      <TabsContent value={STARMAP}>
        {detail ? <StarmapView detail={detail} /> : <Loading />}
      </TabsContent>
      <TabsContent value={RULES} className="flex flex-col gap-2">
        <RuleLists rules={rules} matched={result.matched} missed={result.missed} />
        <p className="type-caption text-muted-foreground">
          {result.notice || engineNotice(result.engineBuild)}
        </p>
      </TabsContent>
    </Tabs>
  )
}

function Loading() {
  return (
    <div className="flex flex-col gap-2" role="status">
      <Skeleton className="h-[min(72vh,48rem)] w-full" />
      <span className="type-small text-muted-foreground">Generating the full map…</span>
    </div>
  )
}
