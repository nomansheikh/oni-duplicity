import { existsSync, readFileSync } from 'node:fs'
import { parseSave, writeSaveParts, type SaveGame } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { applyEdit, listDestinations, type Edit } from '../src/worker/model.ts'
import {
  POINTS_TO_REVEAL,
  listPoiOverview,
  readFog,
  readHarvestState,
  saveGameController,
} from '../src/worker/pois.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { changedPaths, fixtures, galaxy, roundTrip, sameBytes } from './helpers.ts'

const body = (save: SaveGame) => writeSaveParts(save).body.slice()

const base = fixtures.find((f) => f.endsWith('mithro-02-mid-game-cycle-148.sav'))
const load = (path: string) => parseSave(readFileSync(path))

/** Positions where two byte arrays of the same length differ. */
function differing(a: Uint8Array, b: Uint8Array): number[] {
  expect(b.length).toBe(a.length)
  const at: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) at.push(i)
  return at
}

function poiController(save: SaveGame, id: string) {
  const split = id.lastIndexOf(':')
  const obj = save.gameObjects.find((g) => g.name === id.slice(0, split))!.gameObjects[
    Number(id.slice(split + 1))
  ]!
  return obj.behaviors.find((b) => b.name === 'StateMachineController')!
}

// --- Destinations (base game) -------------------------------------------------------------

const destinationTest = base && existsSync(base) ? test : test.skip

destinationTest(
  'destination mass is clamped to the type and only that field changes',
  () => {
    const save = load(base!)
    const before = roundTrip(save)
    const rock = listDestinations(save).find((d) => d.mass)!
    expect(rock.mass!.capacity).toBeGreaterThan(0)

    const target = Math.round(rock.mass!.capacity / 3)
    applyEdit(save, { type: 'setDestinationMass', destination: rock.id, mass: target })
    expect(listDestinations(save).find((d) => d.id === rock.id)!.mass!.current).toBe(target)
    applyEdit(save, { type: 'setDestinationMass', destination: rock.id, mass: 1e12 })
    expect(listDestinations(save).find((d) => d.id === rock.id)!.mass!.current).toBe(
      rock.mass!.capacity,
    )
    applyEdit(save, { type: 'setDestinationMass', destination: rock.id, mass: -5 })
    expect(listDestinations(save).find((d) => d.id === rock.id)!.mass!.current).toBe(0)

    applyEdit(save, { type: 'setDestinationMass', destination: rock.id, mass: target })
    const changed = changedPaths(before, roundTrip(save))
    expect(changed).toHaveLength(1)
    expect(changed[0]).toMatch(/\.templateData\.destinations\.\d+\.availableMass$/)
  },
  120_000,
)

destinationTest(
  'destination mass refuses what it cannot set',
  () => {
    const save = load(base!)
    const destinations = listDestinations(save)
    const none = destinations.find((d) => !d.mass)
    expect(none, 'a destination with nothing to recover').toBeDefined()
    expect(() =>
      applyEdit(save, { type: 'setDestinationMass', destination: none!.id, mass: 10 }),
    ).toThrow()
    expect(() =>
      applyEdit(save, { type: 'setDestinationMass', destination: -99, mass: 10 }),
    ).toThrow()
    expect(() =>
      applyEdit(save, { type: 'setDestinationMass', destination: destinations[0]!.id, mass: NaN }),
    ).toThrow()
  },
  120_000,
)

destinationTest(
  'destination analysis sets the score and clears the scan target',
  () => {
    const save = load(base!)
    const hidden = listDestinations(save).filter((d) => d.analysis === 'hidden')
    expect(hidden.length).toBeGreaterThan(1)
    const [first, second] = hidden as [(typeof hidden)[number], (typeof hidden)[number]]
    const before = roundTrip(save)

    applyEdit(save, { type: 'setDestinationAnalysis', destination: first.id, level: 'discovered' })
    let view = listDestinations(save).find((d) => d.id === first.id)!
    expect(view.analysis).toBe('discovered')
    expect(view.score).toBe(50)

    applyEdit(save, { type: 'setDestinationAnalysis', destination: first.id, level: 'complete' })
    view = listDestinations(save).find((d) => d.id === first.id)!
    expect(view.analysis).toBe('complete')
    expect(view.score).toBe(100)
    // Completing again leaves a complete score alone.
    applyEdit(save, { type: 'setDestinationAnalysis', destination: first.id, level: 'complete' })
    expect(listDestinations(save).find((d) => d.id === first.id)!.score).toBe(100)

    // Only the destination being scanned has its target cleared.
    const manager = save.gameObjects
      .find((g) => g.name === 'SaveGame')!
      .gameObjects[0]!.behaviors.find((b) => b.name === 'SpacecraftManager')!.templateData!
    manager.analyzeDestinationID = second.id
    applyEdit(save, { type: 'setDestinationAnalysis', destination: first.id, level: 'complete' })
    expect(manager.analyzeDestinationID).toBe(second.id)
    applyEdit(save, { type: 'setDestinationAnalysis', destination: second.id, level: 'complete' })
    expect(manager.analyzeDestinationID).toBe(-1)

    const changed = changedPaths(before, roundTrip(save))
    expect(
      changed.filter(
        (p) => !/\.templateData\.(destinationAnalysisScores(\.|$)|analyzeDestinationID$)/.test(p),
      ),
    ).toEqual([])
  },
  120_000,
)

destinationTest(
  'undo restores every destination edit byte for byte',
  () => {
    const save = load(base!)
    const before = body(save)
    const hidden = listDestinations(save).find((d) => d.analysis === 'hidden')!
    const withMass = listDestinations(save).find((d) => d.mass)!
    const edits: Edit[] = [
      { type: 'setDestinationMass', destination: withMass.id, mass: 123 },
      { type: 'setDestinationAnalysis', destination: hidden.id, level: 'discovered' },
      { type: 'setDestinationAnalysis', destination: hidden.id, level: 'complete' },
    ]
    const undo = edits.map((edit) => applyWithRestore(save, edit))
    expect(sameBytes(body(save), before)).toBe(false)
    for (const restore of undo.toReversed()) restore()
    expect(sameBytes(body(save), before)).toBe(true)
  },
  120_000,
)

// --- Reveal the known starmap (Spaced Out) ------------------------------------------------

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

// --- POI stock (experimental) -------------------------------------------------------------

function partlyEmpty(save: SaveGame) {
  const poi = listPoiOverview(save).pois.find(
    (p) => p.harvest && p.harvest.current < p.harvest.max - 100,
  )
  expect(poi, 'a POI that is not full').toBeDefined()
  return poi!
}

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

// --- Reader safety -------------------------------------------------------------------------

/** A copy of the bytes with one little-endian int changed. */
function withInt(bytes: Uint8Array, at: number, value: number): Uint8Array {
  const copy = bytes.slice()
  new DataView(copy.buffer).setInt32(at, value, true)
  return copy
}

test('the fog reader rejects counts that cannot be real', () => {
  const bytes = saveGameController(load(galaxy))!.extraRaw
  const fog = readFog(bytes)!
  // The count sits right before the values; the length ints are two and three ints before it.
  const countAt = fog.valuesAt - 4
  expect(readFog(bytes)).not.toBeNull()
  for (const count of [-1, -1000, 2_000_000]) {
    let forged = withInt(bytes, countAt, count)
    forged = withInt(forged, countAt - 4, count * 16)
    forged = withInt(forged, countAt - 8, count * 16 + 8)
    expect(readFog(forged), `count ${count}`).toBeNull()
  }
}, 120_000)

test('the stock reader checks the parameter against the instance it belongs to', () => {
  const save = load(galaxy)
  const poi = listPoiOverview(save).pois.find((p) => p.harvest)!
  const bytes = poiController(save, poi.id).extraRaw
  const state = readHarvestState(bytes)!
  // The instance length sits 24 bytes before the stock float, after the state name.
  const lengthAt = state.capacityAt - 24
  expect(readHarvestState(withInt(bytes, lengthAt, 0))).toBeNull()
  expect(readHarvestState(withInt(bytes, lengthAt, -5))).toBeNull()
  // A length that ends before the parameter, or past the bytes, is not this layout.
  expect(
    readHarvestState(withInt(bytes, lengthAt, state.parameterAt - state.capacityAt)),
  ).toBeNull()
  expect(readHarvestState(withInt(bytes, lengthAt, bytes.length))).toBeNull()
  // The parameter name must carry its own length prefix.
  expect(readHarvestState(withInt(bytes, state.parameterAt - 4 - 11, 12))).toBeNull()
}, 120_000)

destinationTest(
  'no destination carries a startAnalyzed flag in a save',
  () => {
    // `SpaceDestination.startAnalyzed` is not serialized, so a save cannot mark a destination as
    // analyzed from the start; the analysis state comes from the score alone.
    const manager = load(base!)
      .gameObjects.find((g) => g.name === 'SaveGame')!
      .gameObjects[0]!.behaviors.find((b) => b.name === 'SpacecraftManager')!.templateData!
    for (const d of manager.destinations as Record<string, unknown>[]) {
      expect('startAnalyzed' in d).toBe(false)
    }
  },
  120_000,
)
