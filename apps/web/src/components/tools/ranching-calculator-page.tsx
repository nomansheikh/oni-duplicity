import { useMemo, useState } from 'react'
import { ranching } from '@oni-duplicity/game-data'
import { PageHeader } from '@/components/page-header'
import { defaultFeed, findSpecies, planRanch, type FeedChoice } from '@/lib/tools/ranching-calc'
import { herdsFromSave } from '@/lib/tools/ranching-herds'
import type { CritterView } from '@/worker/model'
import { RanchFlow, type RanchControls } from './ranching-flow'

/** Read only: nothing here edits the save. */
export function RanchingCalculatorPage({ critters }: { critters: CritterView[] }) {
  const herds = useMemo(() => herdsFromSave(critters), [critters])
  const first = herds[0]?.species ?? findSpecies('Hatch') ?? ranching.species[0]!
  const [speciesId, setSpeciesId] = useState(first.id)
  const [critterCount, setCritterCount] = useState(herds[0]?.count ?? 8)
  const [cells, setCells] = useState(96)
  const [bySpace, setBySpace] = useState(false)
  const [tame, setTame] = useState(true)
  const [rancherSkill, setRancherSkill] = useState(0)
  const [secondsPerRancher, setSecondsPerRancher] = useState(600)
  const [feed, setFeed] = useState<FeedChoice[]>(() => defaultFeed(first))

  const species = findSpecies(speciesId) ?? first
  const plan = planRanch(species, {
    ...(bySpace ? { cells } : { critters: critterCount }),
    tame,
    rancherSkill,
    secondsPerRancher,
    feed,
  })

  const controls: RanchControls = {
    species,
    herds,
    plan,
    critterCount,
    cells,
    bySpace,
    tame,
    rancherSkill,
    secondsPerRancher,
    feed,
    pickSpecies: (id, count) => {
      const next = findSpecies(id)
      if (!next) return
      setSpeciesId(id)
      setFeed(defaultFeed(next))
      if (count !== undefined) {
        setCritterCount(count)
        setBySpace(false)
      }
    },
    setCritterCount,
    setCells,
    setBySpace,
    setTame,
    setRancherSkill,
    setSecondsPerRancher,
    setFeed,
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Ranching calculator"
        description="Pick a species and morph, then change anything in the flow: the herd, what it eats, who ranches it. Every figure comes from the game's own code."
      />
      <RanchFlow {...controls} />
    </div>
  )
}
