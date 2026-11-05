import { Badge, type badgeVariants } from '@/components/ui/badge'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

const DLCS: Record<string, { name: string; variant: BadgeVariant }> = {
  EXPANSION1_ID: {
    name: 'Spaced Out!',
    variant: 'dlc',
  },
  DLC2_ID: {
    name: 'Frosty Planet',
    variant: 'oxygen',
  },
  DLC3_ID: {
    name: 'Bionic Booster',
    variant: 'power',
  },
  DLC4_ID: {
    name: 'Prehistoric Planet',
    variant: 'plant',
  },
  DLC5_ID: {
    name: 'Aquatic Planet',
    variant: 'water',
  },
}

export function DlcBadge({ id, className }: { id: string; className?: string }) {
  const dlc = DLCS[id]
  return (
    <Badge variant={dlc?.variant ?? 'outline'} className={className}>
      {dlc?.name ?? id}
    </Badge>
  )
}

/** All DLC badges for a save, or a neutral "Base game" badge. */
export function DlcBadges({ ids, className }: { ids: string[]; className?: string }) {
  if (ids.length === 0) return <Badge variant="secondary">Base game</Badge>
  const order = Object.keys(DLCS)
  const sorted = [...new Set(ids)].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  return (
    <span className={cn('flex flex-wrap gap-1', className)}>
      {sorted.map((id) => (
        <DlcBadge key={id} id={id} />
      ))}
    </span>
  )
}
