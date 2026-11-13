import type { GameObject, SaveGame } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { allMaterialItems, elementOf } from '../src/worker/material-items.ts'
import { applyEdit, listMaterials } from '../src/worker/model.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { MAX_CHUNK_MASS, MAX_SPAWN_MASS, splitMass } from '../src/worker/spawn.ts'
import { body, instanceOf, load } from './debris-helpers.ts'
import { fixtures, galaxy, roundTrip, sameBytes } from './helpers.ts'

const group = (save: SaveGame, name: string) => save.gameObjects.find((g) => g.name === name)
const pod = (save: SaveGame) =>
  group(save, 'Headquarters')!.gameObjects[0] as GameObject & { position: { x: number; y: number } }
const td = (obj: GameObject, name: string) =>
  obj.behaviors.find((b) => b.name === name)?.templateData as Record<string, unknown>
const position = (obj: GameObject) =>
  (obj as unknown as { position: { x: number; y: number; z: number } }).position
const totalMass = (save: SaveGame, elementId: string) =>
  allMaterialItems(save)
    .filter((i) => elementOf(i.obj) === elementId)
    .reduce((sum, i) => sum + Number(td(i.obj, 'PrimaryElement').Units), 0)

test('spawning a solid adds one fresh loose chunk at the printing pod', () => {
  const save = load(galaxy)
  const before = [...group(save, 'Iron')!.gameObjects]
  const next = Number(save.settings.nextUniqueID)

  applyEdit(save, { type: 'spawnDebris', elementId: 'Iron', mass: 250, kelvin: 300 })

  const after = group(save, 'Iron')!.gameObjects
  expect(after.slice(0, before.length)).toEqual(before)
  expect(after).toHaveLength(before.length + 1)
  const chunk = after.at(-1)!
  expect(instanceOf(chunk)).toBe(next)
  expect(Number(save.settings.nextUniqueID)).toBe(next + 1)
  expect(td(chunk, 'PrimaryElement')).toMatchObject({
    Units: 250,
    _Temperature: 300,
    diseaseID: { hash: 0 },
    diseaseCount: 0,
  })
  expect(td(chunk, 'KPrefabID').serializedTags).toEqual([])
  expect(td(chunk, 'Clearable').isMarkedForClear).toBe(false)
  expect(td(chunk, 'Movable')).toMatchObject({ isMarkedForMove: false, storageProxy: null })
  expect(position(chunk)).toMatchObject({ x: pod(save).position.x, y: pod(save).position.y })
  // The ore layer's depth, as every other loose chunk has, not the pod building's.
  expect(position(chunk).z).toBe(position(before[0]!).z)
})

test('a spawned chunk survives a write and re-read', () => {
  const save = load(galaxy)
  const mass = totalMass(save, 'Iron')
  applyEdit(save, { type: 'spawnDebris', elementId: 'Iron', mass: 1234.5, kelvin: 310 })
  const reread = roundTrip(save)
  expect(totalMass(reread, 'Iron')).toBeCloseTo(mass + 1234.5, 2)
  const chunk = group(reread, 'Iron')!.gameObjects.at(-1)!
  expect(td(chunk, 'PrimaryElement')._Temperature).toBeCloseTo(310, 3)
})

test('an element held only in storage is spawned into a new loose group', () => {
  const save = load(galaxy)
  expect(group(save, 'Steel')).toBeUndefined()
  expect(totalMass(save, 'Steel')).toBeGreaterThan(0)

  applyEdit(save, { type: 'spawnDebris', elementId: 'Steel', mass: 500, kelvin: 295 })

  expect(group(save, 'Steel')!.gameObjects).toHaveLength(1)
  const reread = roundTrip(save)
  expect(group(reread, 'Steel')!.gameObjects).toHaveLength(1)
  expect(listMaterials(reread).find((m) => m.id === 'Steel')).toMatchObject({
    looseCount: 1,
    looseMass: 500,
  })
})

test('a liquid copies its own components and clears a pending dump order', () => {
  const save = load(galaxy)
  applyEdit(save, { type: 'spawnDebris', elementId: 'SaltWater', mass: 80, kelvin: 300 })
  const chunk = group(save, 'SaltWater')!.gameObjects.at(-1)!
  expect(chunk.behaviors.map((b) => b.name)).toContain('Dumpable')
  expect(td(chunk, 'Dumpable').isMarkedForDumping).toBe(false)
  expect(roundTrip(save)).toBeTruthy()
})

test('more than one chunk worth is split into equal chunks the game keeps', () => {
  expect(splitMass(250_000)).toEqual([250_000 / 3, 250_000 / 3, 250_000 / 3])
  expect(splitMass(MAX_CHUNK_MASS)).toEqual([MAX_CHUNK_MASS])
  const save = load(galaxy)
  const count = group(save, 'Iron')!.gameObjects.length
  const next = Number(save.settings.nextUniqueID)
  applyEdit(save, { type: 'spawnDebris', elementId: 'Iron', mass: 250_000, kelvin: 300 })
  const added = group(save, 'Iron')!.gameObjects.slice(count)
  expect(added).toHaveLength(3)
  expect(added.map(instanceOf)).toEqual([next, next + 1, next + 2])
  for (const chunk of added) {
    expect(Number(td(chunk, 'PrimaryElement').Units)).toBeLessThanOrEqual(MAX_CHUNK_MASS)
  }
})

test('undo puts the save back byte for byte, including a new group', () => {
  for (const elementId of ['Iron', 'Steel']) {
    const save = load(galaxy)
    const bytes = body(save)
    const undo = applyWithRestore(save, {
      type: 'spawnDebris',
      elementId,
      mass: 150_000,
      kelvin: 300,
    })
    expect(sameBytes(body(save), bytes)).toBe(false)
    undo()
    expect(sameBytes(body(save), bytes)).toBe(true)
  }
})

test('unsafe spawns are refused and change nothing', () => {
  const save = load(galaxy)
  const bytes = body(save)
  const refused: [string, number, number, RegExp][] = [
    ['Oxygen', 10, 300, /solids and liquids/],
    ['Niobium', 10, 300, /no Niobium anywhere/],
    ['NotAnElement', 10, 300, /not a known element/],
    ['Iron', 0, 300, /above 0 kg/],
    ['Iron', Number.NaN, 300, /above 0 kg/],
    ['Iron', MAX_SPAWN_MASS + 1, 300, /At most/],
    ['Iron', 10, 0, /Temperature/],
    ['Iron', 10, 10_001, /Temperature/],
  ]
  for (const [elementId, mass, kelvin, message] of refused) {
    expect(() => applyEdit(save, { type: 'spawnDebris', elementId, mass, kelvin })).toThrow(message)
  }
  expect(sameBytes(body(save), bytes)).toBe(true)
})

test('the materials list says which elements cannot be spawned', () => {
  const materials = listMaterials(load(galaxy))
  expect(materials.find((m) => m.id === 'Iron')?.spawnRefusal).toBeUndefined()
  expect(materials.find((m) => m.id === 'SaltWater')?.spawnRefusal).toBeUndefined()
  expect(materials.find((m) => m.id === 'Oxygen')?.spawnRefusal).toMatch(/solids and liquids/)
})

test('mass edits stop at the most the game keeps per chunk', () => {
  const save = load(galaxy)
  const iron = group(save, 'Iron')!.gameObjects[0]!
  applyEdit(save, { type: 'setItemMass', ref: 'Iron:0', mass: 250_000 })
  expect(td(iron, 'PrimaryElement').Units).toBe(MAX_CHUNK_MASS)
  applyEdit(save, { type: 'scaleMaterialMass', elementId: 'Iron', factor: 1_000_000 })
  for (const item of allMaterialItems(save).filter((i) => elementOf(i.obj) === 'Iron')) {
    expect(Number(td(item.obj, 'PrimaryElement').Units)).toBeLessThanOrEqual(MAX_CHUNK_MASS)
  }
})

test.each(fixtures)('every spawnable material in %s spawns and re-reads', (path) => {
  const save = load(path)
  const spawnable = listMaterials(save).filter((m) => !m.spawnRefusal)
  expect(spawnable.length).toBeGreaterThan(0)
  const before = new Map(spawnable.map((m) => [m.id, totalMass(save, m.id)]))
  for (const m of spawnable)
    applyEdit(save, { type: 'spawnDebris', elementId: m.id, mass: 100, kelvin: 300 })
  const reread = roundTrip(save)
  for (const m of spawnable) expect(totalMass(reread, m.id)).toBeCloseTo(before.get(m.id)! + 100, 1)
})
