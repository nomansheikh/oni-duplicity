import { Reader, Writer } from '../binary.ts'
import { readGameObject, writeGameObject } from '../game-objects.ts'
import { readTemplateData, writeTemplateData, type TemplateMap } from '../templates.ts'
import type { GameObject, GameObjectGroup, SaveGame, Template } from '../types.ts'

const WORLD = 'Klei.SaveFileRoot'
const SETTINGS = 'Game+Settings'
const GAME_DATA = 'Game+GameSaveData'

function expectName(r: Reader, expected: string): void {
  const name = r.name()
  if (name !== expected) r.fail(`Expected "${expected}", got "${name}"`)
}

function readGameObjects(
  r: Reader,
  templates: TemplateMap,
  onProgress?: (fraction: number) => void,
): GameObjectGroup[] {
  const groupCount = r.i32()
  if (groupCount < 0 || groupCount > r.remaining) r.fail(`Invalid group count ${groupCount}`)
  const groups: GameObjectGroup[] = []
  for (let g = 0; g < groupCount; g++) {
    const name = r.name()
    r.context = name
    const instanceCount = r.i32()
    const length = r.i32()
    if (instanceCount < 0 || length < 0 || length > r.remaining) {
      r.fail(`Invalid group header (count ${instanceCount}, length ${length})`)
    }
    const end = r.pos + length
    const gameObjects: GameObject[] = []
    for (let i = 0; i < instanceCount; i++) gameObjects.push(readGameObject(r, templates, name))
    if (r.pos !== end) r.fail(`Group read ${r.pos - (end - length)} bytes, expected ${length}`)
    groups.push({ name, gameObjects })
    onProgress?.(r.pos / r.bytes.length)
  }
  return groups
}

/** Parse the decompressed body (everything after the templates). */
export function parseBody(
  body: Uint8Array,
  templateList: Template[],
  onProgress?: (fraction: number) => void,
): Omit<SaveGame, 'header' | 'templates' | 'warnings'> {
  const templates: TemplateMap = new Map(templateList.map((t) => [t.name, t]))
  const r = new Reader(body)

  r.context = 'world'
  expectName(r, 'world')
  expectName(r, WORLD)
  const world = readTemplateData(r, templates, WORLD)

  r.context = 'settings'
  expectName(r, SETTINGS)
  const settings = readTemplateData(r, templates, SETTINGS)

  r.context = 'sim data'
  const simLength = r.i32()
  if (simLength < 0) r.fail(`Invalid sim data length ${simLength}`)
  const simData = r.bytesView(simLength)

  r.context = 'version'
  const marker = r.chars(4)
  if (marker !== 'KSAV') r.fail(`Expected "KSAV" marker, got "${marker}"`)
  const version = { major: r.i32(), minor: r.i32() }

  const gameObjects = readGameObjects(r, templates, onProgress)

  r.context = 'game data'
  expectName(r, GAME_DATA)
  const gameData = readTemplateData(r, templates, GAME_DATA)

  if (r.remaining !== 0) r.fail(`${r.remaining} unexpected bytes after the game data`)
  return { world, settings, simData, version, gameObjects, gameData }
}

/** Serialize the body back to uncompressed bytes. */
export function writeBody(save: SaveGame): Uint8Array {
  const templates: TemplateMap = new Map(save.templates.map((t) => [t.name, t]))
  const w = new Writer(Math.max(1 << 20, save.simData.length * 2))

  w.string('world')
  w.string(WORLD)
  writeTemplateData(w, templates, WORLD, save.world)
  w.string(SETTINGS)
  writeTemplateData(w, templates, SETTINGS, save.settings)

  w.i32(save.simData.length)
  w.bytes(save.simData)

  w.chars('KSAV')
  w.i32(save.version.major)
  w.i32(save.version.minor)

  w.i32(save.gameObjects.length)
  for (const group of save.gameObjects) {
    w.string(group.name)
    w.i32(group.gameObjects.length)
    const groupAt = w.beginLength()
    for (const obj of group.gameObjects) writeGameObject(w, templates, obj)
    w.endLength(groupAt)
  }

  w.string(GAME_DATA)
  writeTemplateData(w, templates, GAME_DATA, save.gameData)
  return w.finish()
}
