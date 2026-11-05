import type { ComponentProps, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

/** The game-styled empty state: a hex badge, a caps title, a line in the game's voice, an action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size,
  className,
  ...props
}: {
  icon: LucideIcon
  title: string
  description: ReactNode
  /** Usually a "clear filters" button; pass `{ label, onClick }` for the common case. */
  action?: ReactNode | { label: string; onClick: () => void }
} & Omit<ComponentProps<typeof Empty>, 'title'>) {
  const button =
    action && typeof action === 'object' && 'onClick' in action ? (
      <Button variant="secondary" size="sm" onClick={action.onClick}>
        {action.label}
      </Button>
    ) : (
      (action as ReactNode)
    )
  return (
    <Empty size={size} className={className} {...props}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {button && <EmptyContent>{button}</EmptyContent>}
    </Empty>
  )
}
