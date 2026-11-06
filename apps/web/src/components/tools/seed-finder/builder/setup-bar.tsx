import type { BuilderState } from '@/lib/tools/seed-builder'
import type { SeedCluster } from '@/seed/clusters'
import { dlcsInPlay } from '@/seed/mixing'
import type { SeedPreset } from '@/seed/rules'
import { ClusterPicker } from './cluster-picker'
import { MixingPicker } from './mixing-picker'
import { PresetPicker } from './preset-picker'

/**
 * Cluster, mixing and preset pickers. A preset fills the rows; they stay editable afterwards.
 */
export function SetupBar({
  state,
  cluster,
  onCluster,
  onMixing,
  onPreset,
}: {
  state: BuilderState
  cluster: SeedCluster
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
        <MixingPicker cluster={cluster} levels={state.mixing} onChange={onMixing} />
      </div>
      <label className="flex flex-col gap-1 type-label">
        Preset
        <PresetPicker state={state} dlcs={dlcsInPlay(cluster, state.mixing)} onPreset={onPreset} />
      </label>
    </div>
  )
}
