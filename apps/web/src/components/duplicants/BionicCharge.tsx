import { Progress } from '@/components/ui/progress'
import { fmt } from '@/lib/format'

export function Charge({ joules, capacity }: { joules: number; capacity: number }) {
  return (
    <div className="flex items-center gap-3">
      <Progress
        variant="gauge"
        tone="good"
        value={joules}
        max={capacity}
        overflow={Math.max(0, joules - capacity)}
        className="w-40"
      />
      <span className="type-small tabular-nums">
        {capacity >= 1000 ? `${fmt(joules / 1000, 1)} kJ` : `${fmt(joules, 1)} J`}
      </span>
    </div>
  )
}
