import { expect, test } from 'vite-plus/test'
import { applyEdit } from '../src/worker/model.ts'
import { listPoiOverview, readHarvestState } from '../src/worker/pois.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { changedPaths, galaxy, roundTrip, sameBytes } from './helpers.ts'
import { body, differing, load, partlyEmpty, poiController } from './space-edits-helpers.ts'

test('setting a POI stock rewrites both stored copies and nothing else', () => {
  const save = load(galaxy)
  const poi = partlyEmpty(save)
  const controller = poiController(save, poi.id)
  const bytes = controller.extraRaw
  const state = readHarvestState(bytes)!
  const before = roundTrip(save)

  applyEdit(save, { type: 'setPoiStock', id: poi.id, kg: 1234.5 })

  const after = readHarvestState(controller.extraRaw)!
  expect(after.capacity).toBe(1234.5)
  expect(after.hash).toBe(state.hash)
  expect(after.capacityRoll).toBe(state.capacityRoll)
  expect(controller.extraRaw.length).toBe(bytes.length)
  const at = differing(bytes, controller.extraRaw)
  expect(at.length).toBeGreaterThan(0)
  const allowed = [
    ...[0, 1, 2, 3].map((n) => state.capacityAt + n),
    ...[0, 1, 2, 3].map((n) => state.parameterAt + n),
  ]
  expect(at.every((i) => allowed.includes(i))).toBe(true)

  const view = listPoiOverview(save).pois.find((p) => p.id === poi.id)!
  expect(view.harvest!.current).toBe(1234.5)
  // The artifact side of the same object is untouched.
  expect(view.artifact).toEqual(poi.artifact)

  const changed = changedPaths(before, roundTrip(save))
  expect(changed).toHaveLength(1)
  expect(changed[0]).toMatch(/\.behaviors\.\d+\.extraRaw$/)
}, 120_000)

test('a POI stock is clamped to what the POI holds when full', () => {
  const save = load(galaxy)
  const poi = partlyEmpty(save)
  applyEdit(save, { type: 'setPoiStock', id: poi.id, kg: 1e12 })
  const full = listPoiOverview(save).pois.find((p) => p.id === poi.id)!.harvest!
  expect(full.current).toBe(Math.fround(poi.harvest!.max))
  applyEdit(save, { type: 'setPoiStock', id: poi.id, kg: -10 })
  expect(listPoiOverview(save).pois.find((p) => p.id === poi.id)!.harvest!.current).toBe(0)
}, 120_000)

test('a POI stock edit refuses what it cannot read back safely', () => {
  const save = load(galaxy)
  const poi = partlyEmpty(save)
  expect(() => applyEdit(save, { type: 'setPoiStock', id: poi.id, kg: NaN })).toThrow()
  const artifact = listPoiOverview(save).pois.find((p) => p.kind === 'artifact')!
  expect(() => applyEdit(save, { type: 'setPoiStock', id: artifact.id, kg: 1 })).toThrow(
    /not a harvestable/,
  )
  expect(() => applyEdit(save, { type: 'setPoiStock', id: 'Nothing:0', kg: 1 })).toThrow()

  // When the parameter copy disagrees with the field, the layout is not what we expect.
  const controller = poiController(save, poi.id)
  const state = readHarvestState(controller.extraRaw)!
  const tampered = controller.extraRaw.slice()
  new DataView(tampered.buffer).setFloat32(state.parameterAt, 7, true)
  controller.extraRaw = tampered
  expect(readHarvestState(controller.extraRaw)).toBeNull()
  expect(() => applyEdit(save, { type: 'setPoiStock', id: poi.id, kg: 1 })).toThrow(
    /Could not read/,
  )
  expect(sameBytes(controller.extraRaw, tampered)).toBe(true)
}, 120_000)

test('undo restores a POI stock edit byte for byte', () => {
  const save = load(galaxy)
  const poi = partlyEmpty(save)
  const before = body(save)
  const undo = applyWithRestore(save, { type: 'setPoiStock', id: poi.id, kg: 10 })
  expect(sameBytes(body(save), before)).toBe(false)
  undo()
  expect(sameBytes(body(save), before)).toBe(true)
}, 120_000)
