import { findGeyser, geyserTypes, hashString, resample, unresample } from '@oni-duplicity/game-data'
import type { GeyserTypeEntry } from '@oni-duplicity/game-data'
import type { SaveGame } from '@oni-duplicity/save-parser'
import type { Edit } from '../edit-types.ts'
import { GEYSER_FIELDS, geyserType, type GeyserConfig } from '../geyser-fields.ts'
import { behavior, data, dlcIds, objectById } from '../save-helpers.ts'

/**
 * Only the generic prefabs whose name agrees with the saved type qualify. The deprecated
 * `NiobiumGeyser` prefab and anything a mod renamed are left alone.
 */
export function swappable(prefab: string, type: GeyserTypeEntry | undefined): boolean {
  return type !== undefined && prefab === `GeyserGeneric_${type.id}`
}

/** Types with the same footprint whose DLCs are all active in the save. */
export function swapTargets(save: SaveGame, from: GeyserTypeEntry): GeyserTypeEntry[] {
  const active = new Set(dlcIds(save))
  return geyserTypes.filter(
    (t) =>
      t.id !== from.id && t.shape === from.shape && t.requiredDlcIds.every((d) => active.has(d)),
  )
}

/**
 * Moves a geyser to another type of the same shape. The game builds the object from the prefab
 * named by its group, then recomputes the emitter, codex entry and disease from the saved type
 * hash, so what has to change is the group, the hash, the `scaled*` values the new ranges give
 * the same rolls, the object's own temperature and (when it still has the default one) its name.
 * Everything is checked before anything is touched.
 */
export function setGeyserType(save: SaveGame, id: string, typeId: string): void {
  const split = id.lastIndexOf(':')
  const prefab = id.slice(0, split)
  const obj = objectById(save, id)
  const geyser = behavior(obj, 'Geyser')?.templateData
  const config = geyser?.configuration as GeyserConfig | undefined
  const element = behavior(obj, 'PrimaryElement')?.templateData
  if (!config?.typeId || !element) throw new Error('This is not a geyser that can change type')
  const from = geyserType(config)
  if (!swappable(prefab, from)) {
    throw new Error('Only the game’s generic geysers can change type')
  }
  const to = geyserTypes.find((t) => t.id === typeId)
  if (!to) throw new Error(`Unknown geyser type ${typeId}`)
  if (to.id === from!.id) throw new Error('The geyser already has that type')
  if (to.shape !== from!.shape) {
    throw new Error(`A ${from!.shape} geyser can't become a ${to.shape} one: the footprints differ`)
  }
  const active = new Set(dlcIds(save))
  const missing = to.requiredDlcIds.filter((d) => !active.has(d))
  if (missing.length) {
    throw new Error(`This save doesn't have ${missing.join(', ')} active, which that type needs`)
  }

  // Move the object to its new prefab group, creating the group beside the other geysers.
  const groups = save.gameObjects
  const source = groups.find((g) => g.name === prefab)!
  source.gameObjects.splice(source.gameObjects.indexOf(obj), 1)
  const targetName = `GeyserGeneric_${to.id}`
  let target = groups.find((g) => g.name === targetName)
  if (!target) {
    target = { name: targetName, gameObjects: [] }
    groups.splice(groups.indexOf(source) + 1, 0, target)
  }
  target.gameObjects.push(obj)
  // The game doesn't write empty groups.
  if (source.gameObjects.length === 0) groups.splice(groups.indexOf(source), 1)

  config.typeId.hash = hashString(to.id)
  for (const [field, { roll, range }] of Object.entries(GEYSER_FIELDS)) {
    config[field] = Math.fround(resample(config[roll] ?? 0, to[range]))
  }
  element._Temperature = Math.fround(to.geyserTemperature)

  const nameable = behavior(obj, 'UserNameable')?.templateData
  const oldName = findGeyser(from!.id)?.name
  const newName = findGeyser(to.id)?.name
  if (oldName && newName && typeof nameable?.savedName === 'string') {
    if (nameable.savedName.startsWith(oldName)) {
      nameable.savedName = newName + nameable.savedName.slice(oldName.length)
    }
  }
}

export function setGeyserValue(
  save: SaveGame,
  edit: Extract<Edit, { type: 'setGeyserValue' }>,
): void {
  const config = data(objectById(save, edit.id), 'Geyser').configuration as GeyserConfig | undefined
  const field = GEYSER_FIELDS[edit.field]
  if (!config || !field || !(edit.field in config) || !(field.roll in config)) {
    throw new Error('This geyser has no such setting')
  }
  const type = geyserType(config)
  if (!type) throw new Error('Unknown geyser type; only its name can be changed')
  if (!Number.isFinite(edit.value)) throw new Error('Use a number')
  // Values are stored as single-precision floats.
  const roll = Math.fround(unresample(edit.value, type[field.range]))
  config[field.roll] = roll
  config[edit.field] = Math.fround(resample(roll, type[field.range]))
  return
}
