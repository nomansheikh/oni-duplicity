import { findGeyser, humanize } from '@oni-duplicity/game-data'
import type { Range } from '@oni-duplicity/game-data'
import type { SaveGame } from '@oni-duplicity/save-parser'
import { swapTargets, swappable } from '../edits/geyser.ts'
import { GEYSER_FIELDS, geyserType, rollsMatch, type GeyserConfig } from '../geyser-fields.ts'
import type { GeyserField, GeyserView } from '../geyser-types.ts'
import { behavior, data, objectsWith } from '../save-helpers.ts'
import { asteroidOf, worldBoxes } from '../world-boxes.ts'

export function listGeysers(save: SaveGame): GeyserView[] {
  const boxes = worldBoxes(save)
  return objectsWith(save, 'Geyser').map(({ id, prefab, obj }) => {
    const config = data(obj, 'Geyser').configuration as GeyserConfig
    const name = behavior(obj, 'UserNameable')?.templateData?.savedName
    const type = findGeyser(prefab)
    const ranges = geyserType(config)
    return {
      id,
      prefab,
      typeName: type?.name ?? humanize(prefab),
      ...(type?.desc ? { typeDesc: type.desc } : {}),
      name: typeof name === 'string' ? name : (type?.name ?? prefab),
      x: Math.round(obj.position.x),
      y: Math.round(obj.position.y),
      ...asteroidOf(boxes, obj.position),
      massPerCycle: config.scaledRate ?? 0,
      iterationSeconds: config.scaledIterationLength ?? 0,
      iterationPercent: config.scaledIterationPercent ?? 0,
      yearSeconds: config.scaledYearLength ?? 0,
      yearPercent: config.scaledYearPercent ?? 0,
      ...(ranges
        ? {
            ranges: Object.fromEntries(
              Object.entries(GEYSER_FIELDS).map(([field, { range }]) => [field, ranges[range]]),
            ) as Record<GeyserField, Range>,
          }
        : {}),
      matchesRolls: ranges ? rollsMatch(config, ranges) : true,
      ...(swappable(prefab, ranges) ? { typeId: ranges!.id } : {}),
      swapTargets: swappable(prefab, ranges)
        ? swapTargets(save, ranges!).map((t) => ({
            id: t.id,
            name: findGeyser(t.id)?.name ?? humanize(t.id),
          }))
        : [],
      hasGeyserControl: obj.behaviors.some((b) => b.name.startsWith('Geyser_Control.')),
    }
  })
}
