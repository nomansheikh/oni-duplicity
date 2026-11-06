import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SEED_CLUSTERS } from '@/seed/clusters'
import { SEED_PRESETS } from '@/seed/presets'
import type { SeedPreset } from '@/seed/rules'

const GROUPS = [
  { edition: 'base', title: 'Base game' },
  { edition: 'spaced-out', title: 'Spaced Out' },
] as const

/** Cluster and preset pickers. A preset fills the rows; they stay editable afterwards. */
export function SetupBar({
  cluster,
  onCluster,
  onPreset,
}: {
  cluster: string
  onCluster: (prefix: string) => void
  onPreset: (preset: SeedPreset) => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className="flex flex-col gap-1 type-label">
        Cluster
        <Select value={cluster} onValueChange={onCluster}>
          <SelectTrigger className="w-64" aria-label="Cluster">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUPS.map((group) => (
              <SelectGroup key={group.edition}>
                <SelectLabel>{group.title}</SelectLabel>
                {SEED_CLUSTERS.filter((c) => c.edition === group.edition).map((c) => (
                  <SelectItem key={c.prefix} value={c.prefix}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="flex flex-col gap-1 type-label">
        Preset
        <Select
          value=""
          onValueChange={(id) => {
            const preset = SEED_PRESETS.find((p) => p.id === id)
            if (preset) onPreset(preset)
          }}
        >
          <SelectTrigger className="w-64" aria-label="Preset">
            <SelectValue placeholder="Load a preset…" />
          </SelectTrigger>
          <SelectContent>
            {SEED_PRESETS.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    </div>
  )
}
