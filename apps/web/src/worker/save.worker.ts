import { expose, transfer } from 'comlink'
import {
  parseSave,
  writeSaveParts,
  type GameObject,
  type SaveGame,
} from '@oni-duplicity/save-parser'
import {
  applyEdit,
  catalogs,
  listDuplicants,
  listGeysers,
  cloneValue,
  listCritters,
  listDestinations,
  listGameSettings,
  listTechs,
  listWorlds,
  rawChildren,
  rawGet,
  type RawPath,
  listMaterialItems,
  listMaterials,
  touchedBy,
  summarize,
  type Edit,
} from './model.ts'
import { worldMap } from './map.ts'

/** Captures the state an edit can touch, so undo can put it back. */
function snapshot(save: SaveGame, edit: Edit): () => void {
  // Raw edits restore just the value (or array) they touched; walking the tree is cheap.
  if (edit.type === 'rawSet') {
    const old = rawGet(save, edit.path)
    const parent = rawGet(save, edit.path.slice(0, -1)) as Record<string | number, unknown>
    const key = edit.path[edit.path.length - 1]!
    return () => {
      parent[key] = old
    }
  }
  if (edit.type === 'rawRemove' || edit.type === 'rawDuplicate') {
    const array = rawGet(save, edit.path.slice(0, -1)) as unknown[]
    const copy = [...array]
    return () => {
      array.splice(0, array.length, ...copy)
    }
  }
  const gameInfo = cloneValue(save.header.gameInfo)
  const customGameSettings = cloneValue(save.gameData.customGameSettings)
  const debugWasUsed = save.gameData.debugWasUsed
  const behaviors = touchedBy(save, edit).flatMap((obj: GameObject) =>
    obj.behaviors.map((b) => ({
      b,
      templateData: cloneValue(b.templateData),
      extraData: cloneValue(b.extraData),
    })),
  )
  // Cloning or deleting changes group lists and the unique ID counter, not just behaviors.
  const structural = edit.type === 'deleteObject' || edit.type === 'cloneObject'
  const groups = structural ? save.gameObjects.map((g) => ({ g, list: [...g.gameObjects] })) : []
  const settings = structural ? cloneValue(save.settings) : null
  return () => {
    save.header.gameInfo = gameInfo
    save.gameData.customGameSettings = customGameSettings
    save.gameData.debugWasUsed = debugWasUsed
    for (const s of behaviors) {
      s.b.templateData = s.templateData
      if (s.extraData !== undefined) s.b.extraData = s.extraData
    }
    for (const { g, list } of groups) g.gameObjects = list
    if (settings) save.settings = settings
  }
}

let save: SaveGame | null = null
let fileName = ''
let undoStack: { edit: Edit; restore: () => void }[] = []
let redoStack: Edit[] = []

function current(): SaveGame {
  if (!save) throw new Error('No save loaded')
  return save
}

function status() {
  return { edits: undoStack.length, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 }
}

function apply(edit: Edit) {
  const s = current()
  const restore = snapshot(s, edit)
  applyEdit(s, edit)
  undoStack.push({ edit, restore })
}

const api = {
  load(buffer: ArrayBuffer, name: string, onProgress: (fraction: number) => void) {
    save = null
    undoStack = []
    redoStack = []
    let last = 0
    save = parseSave(buffer, {
      onProgress: (fraction) => {
        if (fraction - last >= 0.02) {
          last = fraction
          onProgress(fraction)
        }
      },
    })
    fileName = name
    return summarize(save, fileName)
  },
  summary: () => summarize(current(), fileName),
  duplicants: () => listDuplicants(current()),
  catalogs: () => catalogs(),
  geysers: () => listGeysers(current()),
  materials: () => listMaterials(current()),
  critters: () => listCritters(current()),
  techs: () => listTechs(current()),
  gameSettings: () => listGameSettings(current()),
  worlds: () => listWorlds(current()),
  destinations: () => listDestinations(current()),
  materialItems: (elementId: string) => listMaterialItems(current(), elementId),
  rawChildren: (path: RawPath, offset?: number, limit?: number) =>
    rawChildren(current(), path, offset, limit),
  worldMap(worldId: string) {
    const map = worldMap(current(), worldId)
    return transfer(map, [map.cells.buffer, map.temperature.buffer, map.mass.buffer])
  },
  status,
  apply(edit: Edit) {
    apply(edit)
    redoStack = []
    return status()
  },
  undo() {
    const last = undoStack.pop()
    if (last) {
      last.restore()
      redoStack.push(last.edit)
    }
    return status()
  },
  redo() {
    const edit = redoStack.pop()
    if (edit) apply(edit)
    return status()
  },
  async save() {
    const s = current()
    const { head, body } = writeSaveParts(s)
    // The browser's native zlib ("deflate") is several times faster than JS on 400 MB bodies.
    const payload = s.header.isCompressed
      ? new Uint8Array(
          await new Response(
            new Blob([body as BlobPart]).stream().pipeThrough(new CompressionStream('deflate')),
          ).arrayBuffer(),
        )
      : body
    const bytes = new Uint8Array(head.length + payload.length)
    bytes.set(head)
    bytes.set(payload, head.length)
    return transfer(bytes, [bytes.buffer])
  },
  close() {
    save = null
    undoStack = []
    redoStack = []
  },
}

export type SaveApi = typeof api

expose(api)
