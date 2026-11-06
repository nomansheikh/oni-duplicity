import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Portrait } from './portrait/Portrait'
import { canDrawPortrait, type PortraitParts } from './portrait/sprites'

const AVATAR_COLORS = [
  'bg-chart-1 text-primary-foreground',
  'bg-chart-2 text-primary-foreground',
  'bg-chart-3 text-primary-foreground',
  'bg-chart-4 text-white',
  'bg-chart-5 text-white',
]

export function DuplicantAvatar({
  name,
  parts,
  size = 36,
  className,
}: {
  name: string
  parts?: PortraitParts
  size?: number
  className?: string
}) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  const drawable = parts && canDrawPortrait(parts)
  return (
    <Avatar className={cn('bg-muted', className)} style={{ width: size, height: size }}>
      {drawable ? (
        <Portrait parts={parts} size={size} />
      ) : (
        <AvatarFallback
          className={cn('font-heading font-semibold', AVATAR_COLORS[hash % AVATAR_COLORS.length])}
        >
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      )}
    </Avatar>
  )
}
