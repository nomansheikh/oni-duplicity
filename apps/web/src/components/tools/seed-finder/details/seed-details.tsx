import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { SeedDetail } from '@/seed/details/types'
import { engineNotice } from '@/seed/result'
import type { SeedRule } from '@/seed/rules'
import { asteroidLabel } from '../results/labels'
import { RuleLists } from '../results/rule-lists'
import { AsteroidView } from './asteroid-view'
import { StarmapView } from './starmap/starmap-view'
import { useSeedDetail } from './use-seed-detail'

const STARMAP = 'starmap'
const RULES = 'rules'

/** How a search result met the rules; the Rules tab only shows for a seed that came from one. */
export interface RuleOutcome {
  rules: SeedRule[]
  matched: string[]
  missed: string[]
  notice: string
}

/** Everything about a seed, generated on demand: its asteroids, starmap and, if searched, its rules. */
export function SeedDetails({
  coordinate,
  outcome,
}: {
  coordinate: string
  outcome?: RuleOutcome
}) {
  const { state, retry } = useSeedDetail(coordinate)
  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2" role="alert">
        <p className="type-small text-destructive">{state.message}</p>
        {!state.unsupported && (
          <Button variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
        )}
      </div>
    )
  }
  if (state.status === 'loading') return <Loading />
  return <Loaded detail={state.detail} outcome={outcome} />
}

function Loaded({ detail, outcome }: { detail: SeedDetail; outcome?: RuleOutcome }) {
  const start = detail.asteroids.find((a) => a.isStart) ?? detail.asteroids[0]
  const [tab, setTab] = useState(start?.id ?? STARMAP)
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="h-auto flex-wrap justify-start">
        {detail.asteroids.map((a) => (
          <TabsTrigger key={a.id} value={a.id}>
            {asteroidLabel(a.id)}
          </TabsTrigger>
        ))}
        <TabsTrigger value={STARMAP}>Starmap</TabsTrigger>
        {outcome && <TabsTrigger value={RULES}>Rules</TabsTrigger>}
      </TabsList>
      {detail.asteroids.map((a) => (
        <TabsContent key={a.id} value={a.id}>
          <AsteroidView detail={detail} asteroid={a} />
        </TabsContent>
      ))}
      <TabsContent value={STARMAP}>
        <StarmapView detail={detail} />
      </TabsContent>
      {outcome && (
        <TabsContent value={RULES} className="flex flex-col gap-2">
          <RuleLists rules={outcome.rules} matched={outcome.matched} missed={outcome.missed} />
          <p className="type-caption text-muted-foreground">
            {outcome.notice || engineNotice(detail.engineBuild)}
          </p>
        </TabsContent>
      )}
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
