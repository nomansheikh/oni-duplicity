import {
  critterAmountMax,
  critterAmountNames,
  findAmount,
  findCritter,
  humanize,
} from '@oni-duplicity/game-data'
import type { SaveGame } from '@oni-duplicity/save-parser'
import { dlcIds, modifiers, named, objectsWith } from '../save-helpers.ts'
import type { CritterView } from '../view-types.ts'
import { asteroidOf, worldBoxes } from '../world-boxes.ts'

export function listCritters(save: SaveGame): CritterView[] {
  const dlcs = dlcIds(save)
  const boxes = worldBoxes(save)
  return objectsWith(save, 'CreatureBrain').map(({ id, prefab, obj }) => {
    const entry = findCritter(prefab)
    return {
      id,
      prefab,
      name: entry?.name ?? humanize(prefab),
      family: entry ? humanize(entry.family.toLowerCase()) : humanize(prefab),
      baby: entry?.baby ?? prefab.endsWith('Baby'),
      x: Math.round(obj.position.x),
      y: Math.round(obj.position.y),
      ...asteroidOf(boxes, obj.position),
      amounts: (modifiers(obj)?.amounts ?? []).map((a) => {
        const limit = critterAmountMax(prefab, a.name, dlcs)
        return {
          ...named(a.name, findAmount(a.name) ?? critterAmountNames[a.name]),
          value: Number((a.value as { value: number }).value),
          ...(limit.max === undefined ? { readOnlyReason: limit.reason } : { max: limit.max }),
        }
      }),
    }
  })
}
