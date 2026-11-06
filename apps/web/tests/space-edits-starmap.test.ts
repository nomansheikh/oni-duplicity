import { expect, test } from 'vite-plus/test'
import { applyEdit } from '../src/worker/model.ts'
import {
  POINTS_TO_REVEAL,
  listPoiOverview,
  readFog,
  saveGameController,
} from '../src/worker/pois.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { changedPaths, galaxy, roundTrip, sameBytes } from './helpers.ts'
import { body, differing, load } from './space-edits-helpers.ts'

test('revealing the known starmap sets only the existing points, keeping the length', () => {
  const save = load(galaxy)
  const controller = saveGameController(save)!
  const bytes = controller.extraRaw
  const fog = readFog(bytes)!
  expect(fog.count).toBeGreaterThan(0)
  const pending = [...fog.points.values()].filter((v) => v < POINTS_TO_REVEAL).length
  expect(pending).toBeGreaterThan(0)
  expect(listPoiOverview(save).reveal).toEqual({ cells: fog.count, pending })
  const before = roundTrip(save)

  applyEdit(save, { type: 'revealStarmap' })

  const after = readFog(controller.extraRaw)!
  expect(after.count).toBe(fog.count)
  expect([...after.points.keys()]).toEqual([...fog.points.keys()])
  expect([...after.points.values()].every((v) => v >= POINTS_TO_REVEAL)).toBe(true)
  // Only float bytes inside the value block changed, and only for cells below 100.
  const at = differing(bytes, controller.extraRaw)
  expect(at.length).toBeGreaterThan(0)
  expect(at.every((i) => i >= fog.valuesAt && i < fog.valuesAt + fog.count * 4)).toBe(true)
  expect(new Set(at.map((i) => Math.floor((i - fog.valuesAt) / 4))).size).toBe(pending)
  expect(listPoiOverview(save).reveal).toEqual({ cells: fog.count, pending: 0 })

  const changed = changedPaths(before, roundTrip(save))
  expect(changed).toHaveLength(1)
  expect(changed[0]).toMatch(/\.behaviors\.\d+\.extraRaw$/)

  expect(() => applyEdit(save, { type: 'revealStarmap' })).toThrow(/already revealed/)
}, 120_000)

test('revealing the starmap shows the POIs on known cells as revealed, and undo hides them', () => {
  const save = load(galaxy)
  const before = body(save)
  const hidden = listPoiOverview(save).pois.filter((p) => p.reveal !== 'revealed')
  expect(hidden.length).toBeGreaterThan(0)
  const undo = applyWithRestore(save, { type: 'revealStarmap' })
  const known = new Set(readFog(saveGameController(save)!.extraRaw)!.points.keys())
  const after = listPoiOverview(save).pois
  for (const poi of after) {
    if (known.has(`${poi.location.r},${poi.location.q}`)) expect(poi.reveal).toBe('revealed')
  }
  undo()
  expect(sameBytes(body(save), before)).toBe(true)
}, 120_000)
