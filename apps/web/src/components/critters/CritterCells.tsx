import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { fmt } from '@/lib/format'
import type { CritterView } from '@/worker/model'
import { amount, meterOf, METERS } from './meters'

export function WildnessBadge({ critter }: { critter: CritterView }) {
  const wildness = amount(critter, 'Wildness')
  if (wildness === undefined) return <span className="text-muted-foreground">—</span>
  return wildness > 0 ? (
    <Badge variant="warn">Wild {fmt(wildness, 0)}%</Badge>
  ) : (
    <Badge variant="good">Tame</Badge>
  )
}

/** A gauge with its number beneath, sized for a table cell. */
export function CellGauge({ critter, id }: { critter: CritterView; id: string }) {
  const m = meterOf(critter.amounts.find((a) => a.id === id))
  if (!m) {
    const raw = amount(critter, id)
    return (
      <span className="type-small text-muted-foreground tabular-nums">
        {raw === undefined ? '—' : fmt(raw * (METERS[id]?.scale ?? 1), METERS[id]?.digits ?? 0)}
      </span>
    )
  }
  return (
    <div className="flex min-w-24 flex-col gap-1">
      <Progress
        variant="gauge"
        tone={m.tone}
        value={m.value}
        max={m.max}
        aria-label={`${critter.name} ${m.spec.label}`}
        className="h-4"
      />
      <span className="type-small text-right text-foreground tabular-nums">{m.text}</span>
    </div>
  )
}

/** The critter's vitals as the game's storage gauges, above the editable fields. */
export function VitalsPanel({ critter }: { critter: CritterView }) {
  const rows = critter.amounts.map((a) => ({ a, m: meterOf(a) })).filter((r) => r.m)
  if (rows.length === 0) return null
  return (
    <Card variant="well" size="sm">
      <CardHeader>
        <CardTitle>Vitals</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {rows.map(({ a, m }) => (
          <Progress
            key={a.id}
            variant="gauge"
            tone={m!.tone}
            value={m!.value}
            max={m!.max}
            label={`${m!.spec.label}: ${m!.text}`}
            state={m!.state}
            aria-label={`${m!.spec.label} gauge`}
          />
        ))}
      </CardContent>
    </Card>
  )
}

export function IconAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
