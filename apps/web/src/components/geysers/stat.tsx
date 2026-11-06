export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink bg-inset px-3 py-2">
      <div className="type-caption text-muted-foreground">{label}</div>
      <div className="type-h3 tabular-nums">{value}</div>
    </div>
  )
}
