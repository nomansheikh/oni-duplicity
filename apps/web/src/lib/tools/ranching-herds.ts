import { findRanchSpecies, type RanchSpecies } from '@oni-duplicity/game-data'

/** `HatchBaby` becomes `Hatch`. Babies take the space of their adult. */
export function adultId(prefab: string): string {
  return prefab.replace(/Baby$/, '')
}

export interface SaveHerd {
  species: RanchSpecies
  /** Adults and babies, which take the same space. */
  count: number
  babies: number
}

/** Groups the critters in a save by ranchable species; prefabs with no data are skipped. */
export function herdsFromSave(critters: { prefab: string; baby: boolean }[]): SaveHerd[] {
  const byId = new Map<string, SaveHerd>()
  for (const c of critters) {
    const species = findRanchSpecies(adultId(c.prefab))
    if (!species) continue
    const herd = byId.get(species.id) ?? { species, count: 0, babies: 0 }
    herd.count += 1
    if (c.baby) herd.babies += 1
    byId.set(species.id, herd)
  }
  return [...byId.values()].sort((a, b) => b.count - a.count)
}
