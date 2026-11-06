import { ArrowDown, ArrowRight } from 'lucide-react'
import type { RanchControls } from './ranching-controls'
import { GetPanel } from './ranching-get'
import { SpeciesBar } from './ranching-species-bar'
import { TakesPanel } from './ranching-takes'
import { TimePanel } from './ranching-time'

export type { RanchControls } from './ranching-controls'

function FlowArrow() {
  return (
    <div aria-hidden className="grid place-items-center text-gold">
      <ArrowDown className="size-8 min-[900px]:hidden" strokeWidth={3} />
      <ArrowRight className="hidden size-8 min-[900px]:block" strokeWidth={3} />
    </div>
  )
}

/**
 * The calculator as one flow: what the herd takes in, how long it takes, what comes out. The
 * inputs live in the boxes they affect, and every box recalculates as they change. Three panels
 * joined by arrows; below 900px they stack and the arrows point down.
 */
export function RanchFlow(c: RanchControls) {
  return (
    <div className="flex flex-col gap-2">
      <SpeciesBar {...c} />
      <div
        data-testid="ranch-flow"
        className="grid items-stretch gap-2 min-[900px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]"
      >
        <TakesPanel {...c} />
        <FlowArrow />
        <TimePanel {...c} />
        <FlowArrow />
        <GetPanel {...c} />
      </div>
    </div>
  )
}
