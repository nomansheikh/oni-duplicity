import type { ReactNode } from 'react'
import { Sparkles, type LucideIcon } from 'lucide-react'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '../empty-state'
import type { DuplicantEdit } from '@/worker/model'

export type EditFn = (change: DuplicantEdit) => void

export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function Nothing({
  title,
  description,
  icon = Sparkles,
}: {
  title: string
  description: string
  icon?: LucideIcon
}) {
  return <EmptyState size="compact" icon={icon} title={title} description={description} />
}

/** The trait name as a badge: green for a positive trait, red for a negative one, plain otherwise. */
