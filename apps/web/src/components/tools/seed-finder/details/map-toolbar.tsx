import { Maximize, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { fmt } from '@/lib/format'
import type { MarkerKind } from '@/seed/details/types'
import { MARKER_KINDS } from './labels'

export type MapMode = 'elements' | 'biomes'

interface Props {
  mode: MapMode
  onMode: (mode: MapMode) => void
  shown: MarkerKind[]
  onShown: (shown: MarkerKind[]) => void
  zoom: number
  onZoom: (factor: number) => void
  onFit: () => void
}

/** Colour mode, marker kinds and zoom for the detail map. */
export function MapToolbar({ mode, onMode, shown, onShown, zoom, onZoom, onFit }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={mode}
        onValueChange={(v) => v && onMode(v as MapMode)}
        aria-label="Colour the map by"
      >
        <ToggleGroupItem value="elements">Elements</ToggleGroupItem>
        <ToggleGroupItem value="biomes">Biomes</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup
        type="multiple"
        variant="outline"
        size="sm"
        value={shown}
        onValueChange={(v) => onShown(v as MarkerKind[])}
        aria-label="Markers shown"
      >
        {MARKER_KINDS.map(({ kind, label }) => (
          <ToggleGroupItem key={kind} value={kind}>
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ButtonGroup className="ml-auto">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Zoom out"
          onClick={() => onZoom(1 / 1.5)}
        >
          <Minus />
        </Button>
        <Button variant="outline" size="sm" className="w-14 tabular-nums" disabled>
          {fmt(zoom, 1)}×
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Zoom in" onClick={() => onZoom(1.5)}>
          <Plus />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Fit the map" onClick={onFit}>
          <Maximize />
        </Button>
      </ButtonGroup>
    </div>
  )
}
