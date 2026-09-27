import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const DLCS: Record<string, { name: string; className: string }> = {
  EXPANSION1_ID: {
    name: 'Spaced Out!',
    className: 'border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300',
  },
  DLC2_ID: {
    name: 'Frosty Planet',
    className: 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300',
  },
  DLC3_ID: {
    name: 'Bionic Booster',
    className: 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
  DLC4_ID: {
    name: 'Prehistoric Planet',
    className: 'border-lime-500/40 bg-lime-500/15 text-lime-700 dark:text-lime-300',
  },
  DLC5_ID: {
    name: 'Aquatic Planet',
    className: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
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
