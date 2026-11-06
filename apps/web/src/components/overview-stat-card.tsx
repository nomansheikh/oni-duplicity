import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function StatCard({
  label,
  value,
  icon,
  footer,
  detail,
  meter,
}: {
  label: string
  value: ReactNode
  icon: ReactNode
  footer: ReactNode
  detail: ReactNode
  meter?: ReactNode
}) {
  return (
    <Card size="sm" className="@container/card">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Badge variant="bare" className="type-h1 tabular-nums [&>svg]:size-6!">
          {icon}
          {value}
        </Badge>
        {meter}
        <div className="line-clamp-1 type-small font-medium">{footer}</div>
        <div className="type-small text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  )
}
