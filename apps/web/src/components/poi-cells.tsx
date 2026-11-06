import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { meterTone } from '@/lib/meter'
import { fmt, humanize } from '@/lib/format'
import type { Edit } from '@/worker/model'
import type { PoiView } from '@/worker/pois'
import { NumberField } from './common'

const SECONDS_PER_CYCLE = 600

const cycles = (seconds: number) => fmt(seconds / SECONDS_PER_CYCLE, 0)

export function Mass({ poi }: { poi: PoiView }) {
  const harvest = poi.harvest
  if (!harvest) return <span className="text-muted-foreground">–</span>
  const percent = harvest.max > 0 ? Math.min(100, (harvest.current / harvest.max) * 100) : 0
  return (
    <div className="flex min-w-48 flex-col gap-1.5">
      <span className="type-small text-white tabular-nums">
        {fmt(harvest.current, 0)} / {fmt(harvest.max, 0)} kg
      </span>
      <Progress
        variant="gauge"
        tone={meterTone('amount', percent)}
        value={percent}
        aria-label="Stock"
      />
    </div>
  )
}

export function Recharge({ poi }: { poi: PoiView }) {
  const harvest = poi.harvest
  if (!harvest) return <span className="text-muted-foreground">–</span>
  if (harvest.current >= harvest.max - 0.5)
    return <span className="text-muted-foreground">Full</span>
  const left = ((harvest.max - harvest.current) / harvest.max) * harvest.rechargeSeconds
  return (
    <span
      className="tabular-nums"
      title={`Refills in ${cycles(harvest.rechargeSeconds)} cycles from empty`}
    >
      {cycles(left)} cycles left
    </span>
  )
}

export function ArtifactCell({ poi }: { poi: PoiView }) {
  const artifact = poi.artifact
  if (!artifact) return <span className="text-muted-foreground">–</span>
  const waiting = artifact.waiting ? humanize(artifact.waiting.replace(/^artifact_/, '')) : null
  let status: string
  if (waiting) status = 'Ready'
  else if (artifact.state === 'recharging')
    status = `${cycles(artifact.remainingSeconds)} cycles left`
  else if (artifact.state === 'waitingForPickup') status = 'Waiting for pickup'
  else status = humanize(artifact.state)
  return (
    <div className="flex flex-col">
      <span className="type-small tabular-nums">{status}</span>
      <span className="type-caption text-muted-foreground">
        {waiting ? `${waiting} · ` : ''}
        {artifact.harvests} taken
      </span>
    </div>
  )
}

export function StockEditor({ poi, onEdit }: { poi: PoiView; onEdit: (edit: Edit) => void }) {
  const harvest = poi.harvest
  if (!harvest) return <span className="text-muted-foreground">–</span>
  return (
    <div className="flex items-center gap-2">
      <NumberField
        label={`Stock of ${poi.name}`}
        value={harvest.current}
        min={0}
        max={Math.floor(harvest.max)}
        unit="kg"
        className="w-36"
        onCommit={(kg) => onEdit({ type: 'setPoiStock', id: poi.id, kg })}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={harvest.current >= harvest.max - 0.5}
        onClick={() => onEdit({ type: 'setPoiStock', id: poi.id, kg: harvest.max })}
      >
        Fill
      </Button>
    </div>
  )
}
