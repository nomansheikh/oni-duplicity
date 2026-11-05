import type { GameObject, SaveGame } from '@oni-duplicity/save-parser'
import { applyEdit, cloneValue, rawGet, touchedBy, type Edit } from './model.ts'

/** Captures the state an edit can touch, so undo can put it back. */
export function snapshot(save: SaveGame, edit: Edit): () => void {
  // Raw edits restore just the value (or array) they touched; walking the tree is cheap.
  if (edit.type === 'rawSet') {
    const old = rawGet(save, edit.path)
    const parent = rawGet(save, edit.path.slice(0, -1)) as Record<string | number, unknown>
    const key = edit.path[edit.path.length - 1]!
    return () => {
      parent[key] = old
    }
  }
  if (edit.type === 'rawRemove' || edit.type === 'rawDuplicate' || edit.type === 'rawAdd') {
    const array = rawGet(
      save,
      edit.type === 'rawAdd' ? edit.path : edit.path.slice(0, -1),
    ) as unknown[]
    const copy = [...array]
    return () => {
      array.splice(0, array.length, ...copy)
    }
  }
  const gameInfo = cloneValue(save.header.gameInfo)
  const customGameSettings = cloneValue(save.gameData.customGameSettings)
  const hadDebugWasUsed = 'debugWasUsed' in save.gameData
  const debugWasUsed = save.gameData.debugWasUsed
  const behaviors = touchedBy(save, edit).flatMap((obj: GameObject) =>
    obj.behaviors.map((b) => ({
      b,
      templateData: cloneValue(b.templateData),
      extraData: cloneValue(b.extraData),
      extraRaw: b.extraRaw,
    })),
  )
  // Cloning or deleting changes group lists and the unique ID counter, not just behaviors.
  const structural =
    edit.type === 'deleteObject' || edit.type === 'deleteDebris' || edit.type === 'cloneObject'
  const groups = structural ? save.gameObjects.map((g) => ({ g, list: [...g.gameObjects] })) : []
  const settings = structural ? cloneValue(save.settings) : null
  // Changing a geyser's type moves it between groups, and may add or drop a group.
  const layout =
    edit.type === 'setGeyserType'
      ? {
          all: [...save.gameObjects],
          lists: save.gameObjects.map((g) => ({ g, list: [...g.gameObjects] })),
        }
      : null
  return () => {
    if (layout) {
      for (const { g, list } of layout.lists) g.gameObjects = list
      save.gameObjects.splice(0, save.gameObjects.length, ...layout.all)
    }
    save.header.gameInfo = gameInfo
    save.gameData.customGameSettings = customGameSettings
    // Put the key back only if the save had it, so writing stays identical.
    if (hadDebugWasUsed) save.gameData.debugWasUsed = debugWasUsed
    else delete (save.gameData as { debugWasUsed?: boolean }).debugWasUsed
    for (const s of behaviors) {
      s.b.templateData = s.templateData
      if (s.extraData !== undefined) s.b.extraData = s.extraData
      // Edits that touch raw bytes replace the array instead of changing it in place.
      s.b.extraRaw = s.extraRaw
    }
    for (const { g, list } of groups) g.gameObjects = list
    if (settings) save.settings = settings
  }
}

/**
 * Applies an edit and returns the function that undoes it. If the edit throws partway (a bulk
 * edit can), what it already changed is put back before the error is rethrown.
 */
export function applyWithRestore(save: SaveGame, edit: Edit): () => void {
  const restore = snapshot(save, edit)
  try {
    applyEdit(save, edit)
  } catch (error) {
    restore()
    throw error
  }
  return restore
}
