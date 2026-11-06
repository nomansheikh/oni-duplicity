import type { ReactNode } from 'react'
import { Info, Rabbit, type LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-4">{children}</CardContent>
    </Card>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="type-label text-muted-foreground">{children}</div>
}

/** A small info icon that shows the text on hover or focus. */
export function InfoTip({ text, label }: { text: string; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Info className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">{text}</TooltipContent>
    </Tooltip>
  )
}

export function Nothing({
  title,
  icon = Rabbit,
  children,
}: {
  title: string
  icon?: LucideIcon
  children: ReactNode
}) {
  return <EmptyState size="compact" icon={icon} title={title} description={children} />
}

/** A labelled value row with an editable number or a value on the right. */
export function FieldRow({
  label,
  tip,
  children,
}: {
  label: string
  tip?: string
  children: ReactNode
}) {
  return (
    <Item variant="outline" size="xs">
      <ItemContent>
        <ItemTitle>
          {label}
          {tip && <InfoTip text={tip} label={`About ${label}`} />}
        </ItemTitle>
      </ItemContent>
      <ItemActions>{children}</ItemActions>
    </Item>
  )
}
