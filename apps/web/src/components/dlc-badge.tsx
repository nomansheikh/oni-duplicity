import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const DLCS: Record<string, { name: string; className: string }> = {
  EXPANSION1_ID: {
    name: 'Spaced Out!',
    className: '[--c:var(--cat-dlc)]',
  },
  DLC2_ID: {
    name: 'Frosty Planet',
    className: '[--c:var(--cat-gas)]',
  },
  DLC3_ID: {
    name: 'Bionic Booster',
    className: '[--c:var(--cat-food)]',
  },
  DLC4_ID: {
    name: 'Prehistoric Planet',
    className: '[--c:var(--cat-plant)]',
  },
  DLC5_ID: {
    name: 'Aquatic Planet',
    className: '[--c:var(--cat-water)]',
  },
}

export function DlcBadge({ id, className }: { id: string; className?: string }) {
  const dlc = DLCS[id]
  return (
    <Badge variant="outline" className={cn(dlc?.className, className)}>
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
