import type { ReactNode } from 'react'

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-b border-ink pb-1 text-2xl font-bold uppercase">{title}</h2>
      {children}
    </section>
  )
}

export function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {label && <span className="w-24 shrink-0 text-xs text-fg-3 uppercase">{label}</span>}
      {children}
    </div>
  )
}
