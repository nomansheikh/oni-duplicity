import type { ReactNode } from 'react'

/**
 * Page title for the calculator pages. A local stand-in until `components/page-header.tsx`
 * from the nav plan has merged; swap it for that and delete this file.
 */
export function ToolHeader({
  title,
  description,
  children,
}: {
  title: string
  description: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="type-h1">{title}</h1>
        <p className="type-small max-w-3xl text-muted-foreground">{description}</p>
      </div>
      {children}
    </header>
  )
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-ink bg-inset px-3 py-2">
      <div className="type-caption text-muted-foreground">{label}</div>
      <div className="type-h3 tabular-nums">{value}</div>
      {hint && <div className="type-caption text-muted-foreground">{hint}</div>}
    </div>
  )
}
