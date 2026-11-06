import { Badge } from '@/components/ui/badge'
import { fmtMass } from '@/lib/format'

// Element states use the game's resource colours: gas cyan, liquid blue, solid tan.
const STATE_VARIANTS = { Solid: 'solid', Liquid: 'liquid', Gas: 'gas' } as const

export function StateBadge({ state }: { state: string }) {
  return (
    <Badge variant={STATE_VARIANTS[state as keyof typeof STATE_VARIANTS] ?? 'secondary'}>
      {state}
    </Badge>
  )
}

// An amount as the game's resource lists show it: a bare number with its unit, and the count of
// places in a quiet caption. An empty amount is a dim dash.
export function Amount({ mass, count }: { mass: number; count: number }) {
  if (count === 0) return <span className="text-muted-foreground">—</span>
  return (
    <Badge variant="bare" className="justify-end">
      {fmtMass(mass)}
      <span className="type-caption text-muted-foreground">· {count}</span>
    </Badge>
  )
}
