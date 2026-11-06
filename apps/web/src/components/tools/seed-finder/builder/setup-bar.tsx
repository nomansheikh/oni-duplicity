import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SeedCluster } from '@/seed/clusters'
import type { MixingLevels } from '@/seed/mixing'
import { SEED_PRESETS } from '@/seed/presets'
import type { SeedPreset } from '@/seed/rules'
import { ClusterPicker } from './cluster-picker'
import { MixingPicker } from './mixing-picker'

/**
 * Cluster, mixing and preset pickers. A preset fills the rows; they stay editable afterwards.
 */
export function SetupBar({
  cluster,
  mixing,
  onCluster,
  onMixing,
  onPreset,
}: {
  cluster: SeedCluster
  mixing: MixingLevels
  onCluster: (prefix: string) => void
  onMixing: (id: string, level: number) => void
  onPreset: (preset: SeedPreset) => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className="flex flex-col gap-1 type-label">
        Cluster
        <ClusterPicker value={cluster.prefix} onChange={onCluster} />
      </label>
      <div className="flex flex-col gap-1 type-label">
        Mixing
        <MixingPicker cluster={cluster} levels={mixing} onChange={onMixing} />
      </div>
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
