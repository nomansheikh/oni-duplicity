/**
 * Display names for the ranching calculator. The data file keeps the ids and placeholder strings
 * the decompiled code uses; this turns them into what the game shows.
 */
import { findElement } from '@oni-duplicity/game-data'
import { humanize } from '@/lib/format'

/** Items and plants that are not elements, by the name the game shows. */
const ITEM_NAMES: Record<string, string> = {
  FishMeat: 'Pacu Fillet',
  Meat: 'Meat',
  BasicFabric: 'Reed Fiber',
  SpiceVine: 'Pincha Pepperplant',
  SwampLily: 'Balm Lily',
  BasicSingleHarvestPlant: 'Mealwood',
  PrickleFlower: 'Bristle Blossom',
  FishFood: 'Fish Food',
  EggShell: 'Egg Shell',
}

export function itemName(id: string): string {
  return ITEM_NAMES[id] ?? findElement(id)?.name ?? humanize(id)
}

/** Placeholder strings in the data that stand for a whole group of foods. */
const GROUPS: { match: RegExp; label: string; detail: string }[] = [
  {
    match: /^<all foods>/,
    label: 'Any food',
    detail: 'Every food the game lists with calories.',
  },
  {
    match: /^<every plantable seed/,
    label: "Any harvestable plant's seeds",
    detail: 'Seeds of every plant that is harvested for a crop, except Kelp seeds.',
  },
  {
    match: /^<butchered prey/,
    label: 'Butchered critters',
    detail: 'Baby and adult critters this species preys on, once butchered.',
  },
]

export interface FeedLabel {
  label: string
  /** The full list or an explanation, shown in a tooltip. */
  detail?: string
}

const SHOWN = 3

export function feedLabel(eats: string[]): FeedLabel {
  if (eats.length === 1) {
    const group = GROUPS.find((g) => g.match.test(eats[0]!))
    if (group) return { label: group.label, detail: group.detail }
  }
  const names = eats.map(itemName)
  if (names.length <= SHOWN) return { label: names.join(', ') }
  return {
    label: `${names.slice(0, SHOWN).join(', ')} and ${names.length - SHOWN} more`,
    detail: names.join(', '),
  }
}
