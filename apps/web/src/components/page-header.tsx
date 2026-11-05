import type { ReactNode } from 'react'
import { FlaskConical, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export interface PageStat {
  label: string
  value: ReactNode
  hint?: ReactNode
}

const STATUS = {
  'read-only': { label: 'Read-only', variant: 'info', icon: Lock },
  experimental: { label: 'Experimental', variant: 'warn', icon: FlaskConical },
} as const

/**
 * The shared top band of every page: a title bar with the page name, a status badge and the page's
 * filters and bulk actions, the purpose line, and an optional strip of up to four summary stats.
 */
export function PageHeader({
  title,
  description,
  status,
  actions,
  summary,
  className,
}: {
  title: ReactNode
  description: ReactNode
  status?: keyof typeof STATUS
  /** Filters and bulk actions, shown on the right of the title bar. */
  actions?: ReactNode
  summary?: PageStat[]
  className?: string
}) {
  const badge = status ? STATUS[status] : null
  return (
    <Card data-slot="page-header" className={className}>
      <CardHeader className="items-center">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <h2 className="type-title-bar">{title}</h2>
          {badge && (
            <Badge variant={badge.variant} data-testid="page-status">
              <badge.icon /> {badge.label}
            </Badge>
          )}
        </CardTitle>
        {actions && (
          <CardAction className="flex flex-wrap items-center gap-2">{actions}</CardAction>
        )}
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {summary && summary.length > 0 && (
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 @3xl/main:grid-cols-4">
            {summary.slice(0, 4).map((stat) => (
              <div key={stat.label} className="well flex flex-col gap-0.5 px-3 py-1.5">
                <dt className="type-caption text-muted-foreground uppercase">{stat.label}</dt>
                <dd className="type-h3 tabular-nums">{stat.value}</dd>
                {stat.hint && <dd className="type-caption text-muted-foreground">{stat.hint}</dd>}
              </div>
            ))}
          </dl>
        </CardContent>
      )}
    </Card>
  )
}
