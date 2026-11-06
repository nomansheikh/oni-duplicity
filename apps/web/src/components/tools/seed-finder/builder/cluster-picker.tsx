import { baseGameName } from '@oni-duplicity/game-data'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SEED_CLUSTERS,
  SPACED_OUT,
  clusterByPrefix,
  clusterGroup,
  dlcName,
  isSpacedOut,
} from '@/seed/clusters'

/** The picker's groups, in `SEED_CLUSTERS` order, titled with the game's names. */
const GROUPS = [...new Set(SEED_CLUSTERS.map(clusterGroup))].map((id) => ({
  id,
  title: id === '' ? baseGameName : dlcName(id),
  clusters: SEED_CLUSTERS.filter((cluster) => clusterGroup(cluster) === id),
}))

/**
 * The cluster select, grouped by the base game, Spaced Out and each planet pack. Inside a pack's
 * group the Spaced Out layouts say so, since the base-game layout of the same asteroid sits beside
 * them.
 */
export function ClusterPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (prefix: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-72" aria-label="Cluster">
        {/* The name alone: the item's Spaced Out caption only matters inside the list. */}
        <SelectValue>{clusterByPrefix(value)?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-96">
        {GROUPS.map((group) => (
          <SelectGroup key={group.id}>
            <SelectLabel>{group.title}</SelectLabel>
            {group.clusters.map((cluster) => (
              <SelectItem key={cluster.prefix} value={cluster.prefix}>
                {cluster.label}
                {group.id !== SPACED_OUT && isSpacedOut(cluster) && (
                  <span className="type-caption text-muted-foreground">{dlcName(SPACED_OUT)}</span>
                )}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
