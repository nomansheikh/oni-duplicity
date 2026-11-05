import { type LucideIcon } from 'lucide-react'
import { Item, ItemContent, ItemMedia } from '@/components/ui/item'
import { Progress } from '@/components/ui/progress'
import { fmt } from '@/lib/format'
import { meterTone, type MeterKind } from '@/lib/meter'
import type { AmountView } from '@/worker/model'
import { GAUGES, readAmount } from './amount-format'

export function AmountMeter({ amount, className }: { amount: AmountView; className?: string }) {
  const { shown, cap, over } = readAmount(amount)
  const pct = cap > 0 ? (Math.min(shown, cap) / cap) * 100 : 0
  const blocks = amount.id === 'HitPoints' || amount.id === 'Stress'
  const kind: MeterKind =
    amount.id === 'HitPoints'
      ? 'health'
      : amount.id === 'Stress' || amount.id === 'BionicGunk'
        ? 'stress'
        : 'amount'
  const vital = blocks || GAUGES.has(amount.id) || amount.id === 'BionicGunk'
  const tone = vital ? meterTone(kind, pct) : 'good'
  if (blocks)
    return (
      <Progress
        variant="blocks"
        tone={tone}
        value={shown}
        max={cap}
        overflow={over}
        className={className}
      />
    )
  if (GAUGES.has(amount.id))
    return (
      <Progress
        variant="gauge"
        tone={tone}
        value={shown}
        max={cap}
        overflow={over}
        className={className}
      />
    )
  return <Progress tone={tone} value={shown} max={cap} overflow={over} className={className} />
}

export function Vital({ amount, Icon }: { amount: AmountView; Icon: LucideIcon }) {
  const { shown, format } = readAmount(amount)
  return (
    <Item variant="need" data-vital={amount.id}>
      <ItemMedia variant="icon">
        <Icon />
      </ItemMedia>
      <ItemContent className="gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="type-body">{amount.name}</span>
          <span className="type-body text-white tabular-nums">
            {fmt(shown, format.digits ?? 0)} {format.unit}
          </span>
        </div>
        <AmountMeter amount={amount} />
      </ItemContent>
    </Item>
  )
}
