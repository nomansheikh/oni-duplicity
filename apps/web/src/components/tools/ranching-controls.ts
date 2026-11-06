import type { RanchSpecies } from '@oni-duplicity/game-data'
import type { FeedChoice, RanchPlan } from '@/lib/tools/ranching-calc'
import type { SaveHerd } from '@/lib/tools/ranching-herds'

export const KIND_LABEL = {
  solid: 'Item or element',
  plant: 'Plant, eaten as it grows',
  plantStorage: 'Plant, from its storage',
  prey: 'Butchered critter',
} as const

/** Everything the flow shows and edits; the page owns the state. */
export interface RanchControls {
  species: RanchSpecies
  herds: SaveHerd[]
  plan: RanchPlan
  critterCount: number
  cells: number
  bySpace: boolean
  tame: boolean
  rancherSkill: number
  secondsPerRancher: number
  feed: FeedChoice[]
  pickSpecies: (id: string, count?: number) => void
  setCritterCount: (n: number) => void
  setCells: (n: number) => void
  setBySpace: (v: boolean) => void
  setTame: (v: boolean) => void
  setRancherSkill: (n: number) => void
  setSecondsPerRancher: (n: number) => void
  setFeed: (feed: FeedChoice[]) => void
}
