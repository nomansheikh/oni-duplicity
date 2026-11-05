import { expose, transfer } from 'comlink'
import { parseSave, writeSaveParts, type SaveGame } from '@oni-duplicity/save-parser'
import {
  catalogs,
  listDuplicants,
  listGeysers,
  listCritters,
  listDestinations,
  listGameSettings,
  listTechs,
  listWorlds,
  rawChildren,
  type RawPath,
  listMaterialItems,
  listMaterials,
  summarize,
  type Edit,
} from './model.ts'
import { describeEdit } from './describe.ts'
import { worldMap } from './map.ts'
import { applyWithRestore } from './snapshot.ts'
import { listPoiOverview } from './pois.ts'

let save: SaveGame | null = null
let fileName = ''
let undoStack: { edit: Edit; restore: () => void; label: string }[] = []
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
  // Describe first: a delete can remove the name the label needs.
  const label = describeEdit(s, edit)
  const restore = applyWithRestore(s, edit)
  undoStack.push({ edit, restore, label })
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
  pois: () => listPoiOverview(current()),
  materialItems: (elementId: string) => listMaterialItems(current(), elementId),
  rawChildren: (path: RawPath, offset?: number, limit?: number) =>
    rawChildren(current(), path, offset, limit),
  worldMap(worldId: string) {
    const map = worldMap(current(), worldId)
    return transfer(map, [map.cells.buffer, map.temperature.buffer, map.mass.buffer])
  },
  /** Unsaved edits, oldest first. */
  history: () => undoStack.map((e) => e.label),
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
