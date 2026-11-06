import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BuilderState } from '@/lib/tools/seed-builder'
import { presetNeeds, presetStatus } from '@/lib/tools/seed-presets'
import { dlcName } from '@/seed/clusters'
import { SEED_PRESETS } from '@/seed/presets'
import type { SeedPreset } from '@/seed/rules'

/** The picker's value while the rows differ from their preset, so picking it again reloads it. */
const EDITED = 'edited'

/**
 * The preset select. It keeps showing the preset the rows came from, marked edited once they
 * stop matching it. A preset that needs a DLC not in play is disabled and says which.
 */
export function PresetPicker({
  state,
  dlcs,
  onPreset,
}: {
  state: BuilderState
  dlcs: string[]
  onPreset: (preset: SeedPreset) => void
}) {
  const status = presetStatus(state, dlcs)
  const value = status ? (status.edited ? EDITED : status.preset.id) : ''
  return (
    <Select
      value={value}
      onValueChange={(id) => {
        const preset = SEED_PRESETS.find((p) => p.id === id)
        if (preset) onPreset(preset)
      }}
    >
      <SelectTrigger className="w-64" aria-label="Preset">
        <SelectValue placeholder="Load a preset…">
          {status && `${status.preset.name}${status.edited ? ' (edited)' : ''}`}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-96 w-80">
        {SEED_PRESETS.map((preset) => {
          const missing = presetNeeds(preset).filter((id) => !dlcs.includes(id))
          return (
            <SelectItem key={preset.id} value={preset.id} disabled={missing.length > 0}>
              <span className="flex flex-col">
                {preset.name}
                <span className="type-caption text-muted-foreground">{preset.description}</span>
                {missing.length > 0 && (
                  <span className="type-caption text-muted-foreground">
                    Needs {missing.map(dlcName).join(', ')}.
                  </span>
                )}
              </span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
