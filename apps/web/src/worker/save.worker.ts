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
  objectById,
  saveGameObject,
  summarize,
  type Edit,
} from './model.ts'

/**
 * Deep copy for undo snapshots. Unlike structuredClone, a Uint8Array view copies only its own bytes,
 * not the (possibly 400 MB) buffer it points into.
 */
function clone<T>(value: T): T {
  if (value instanceof Uint8Array) return value.slice() as T
  if (Array.isArray(value)) return value.map(clone) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = clone(v)
    return out as T
  }
  return value
}

/** Captures the state an edit can touch, so undo can put it back. */
function snapshot(save: SaveGame, edit: Edit): () => void {
  const gameInfo = clone(save.header.gameInfo)
  const target: GameObject | undefined =
    'id' in edit ? objectById(save, edit.id) : saveGameObject(save)
  const behaviors = (target?.behaviors ?? []).map((b) => ({
    b,
    templateData: clone(b.templateData),
    extraData: clone(b.extraData),
  }))
  return () => {
    save.header.gameInfo = gameInfo
    for (const s of behaviors) {
      s.b.templateData = s.templateData
      if (s.extraData !== undefined) s.b.extraData = s.extraData
    }
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
