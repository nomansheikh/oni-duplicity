import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { fmt } from '@/lib/format'
import type { WorldView } from '@/worker/model'
import type { Mode } from './useMapCanvas'

export function MapControls({
  worlds,
  worldId,
  onWorld,
  mode,
  onMode,
  zoom,
  onZoom,
}: {
  worlds: WorldView[]
  worldId: string
  onWorld: (id: string) => void
  mode: Mode
  onMode: (mode: Mode) => void
  zoom: number
  onZoom: (direction: 1 | -1) => void
}) {
  const ordered = worlds
  return (
    <>
      {ordered.length > 1 && (
        <Select value={worldId} onValueChange={onWorld}>
          <SelectTrigger size="sm" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ordered.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
                {!w.discovered && <span className="text-muted-foreground">(undiscovered)</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={mode}
        onValueChange={(v) => v && onMode(v as Mode)}
      >
        <ToggleGroupItem value="element">Elements</ToggleGroupItem>
        <ToggleGroupItem value="temperature">Temperature</ToggleGroupItem>
        <ToggleGroupItem value="mass">Mass</ToggleGroupItem>
      </ToggleGroup>
      <ButtonGroup>
        <Button variant="outline" size="icon-sm" aria-label="Zoom out" onClick={() => onZoom(-1)}>
          <Minus />
        </Button>
        <Button variant="outline" size="sm" className="w-12 tabular-nums" disabled>
          {fmt(zoom, Number.isInteger(zoom) ? 0 : 1)}×
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Zoom in" onClick={() => onZoom(1)}>
          <Plus />
        </Button>
      </ButtonGroup>
    </>
  )
}
