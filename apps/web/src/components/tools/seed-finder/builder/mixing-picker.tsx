import { mixingSections, type MixingSetting } from '@oni-duplicity/game-data'
import { Blend, ChevronsUpDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { SPACED_OUT, dlcName, type SeedCluster } from '@/seed/clusters'
import { guaranteeRoom, mixingAvailable, mixingFor, type MixingLevels } from '@/seed/mixing'
import { DlcRow, RemixRow } from './mixing-rows'

/** A section with the game's header, and its tooltip as the note under it. */
function Section({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <header>
        <h3 className="type-label">{title}</h3>
        <p className="type-caption whitespace-pre-line text-muted-foreground">{desc}</p>
      </header>
      {children}
    </section>
  )
}

/** How many settings are switched on, for the trigger. */
const activeCount = (levels: MixingLevels) => Object.values(levels).filter((v) => v > 0).length

/**
 * DLC mixing for the chosen cluster, offering only what the game offers for it. The levels go
 * into the coordinate's mixing code, so Copy code and the Mapsnotincluded link get the same map.
 */
export function MixingPicker({
  cluster,
  levels,
  onChange,
}: {
  cluster: SeedCluster
  levels: MixingLevels
  onChange: (id: string, level: number) => void
}) {
  const settings = mixingFor(cluster)
  const room = guaranteeRoom(cluster, levels)
  const included = cluster.requiredDlcIds.filter((id) => id !== SPACED_OUT).map(dlcName)
  const count = activeCount(levels)
  const row = (setting: MixingSetting) => {
    const level = levels[setting.id] ?? 0
    const change = (next: number) => onChange(setting.id, next)
    if (setting.kind === 'dlc') {
      return <DlcRow key={setting.id} setting={setting} level={level} onChange={change} />
    }
    return (
      <RemixRow
        key={setting.id}
        setting={setting}
        level={level}
        available={mixingAvailable(setting, cluster, levels)}
        roomLeft={room[setting.kind] > 0}
        onChange={change}
      />
    )
  }
  const sections = mixingSections
    .map((section) => ({
      ...section,
      settings: settings.filter((setting) => setting.kind === section.kind),
    }))
    .filter((section) => section.settings.length > 0)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-[2.1rem] w-48 justify-between" aria-label="Mixing">
          <span className="flex items-center gap-2">
            <Blend />
            {count === 0 ? 'No mixing' : `${count} mixed in`}
          </span>
          <ChevronsUpDown className="opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[26rem] gap-3" align="start">
        {included.length > 0 && (
          <p className="type-caption text-muted-foreground">
            This cluster already includes {included.join(', ')}.
          </p>
        )}
        {sections.length === 0 && (
          <p className="type-small text-muted-foreground">This cluster takes no mixing.</p>
        )}
        {sections.map((section, index) => (
          <div key={section.kind} className="flex flex-col gap-3">
            {index > 0 && <Separator />}
            <Section title={section.title} desc={section.desc}>
              {section.settings.map(row)}
            </Section>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}
