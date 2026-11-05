import { readFileSync } from 'node:fs'
import { parseSave, writeSaveParts, type SaveGame } from '@oni-duplicity/save-parser'
import { describe, expect, test } from 'vite-plus/test'
import {
  clampImpact,
  demoliorTravel,
  listDlc,
  readDemolior,
  readGeothermal,
  readMixing,
  MIN_CYCLES_BEFORE_IMPACT,
} from '../src/worker/dlc.ts'
import { applyEdit } from '../src/worker/model.ts'
import { describeEdit } from '../src/worker/describe.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { changedPaths, fixtures, roundTrip, sameBytes } from './helpers.ts'

const find = (name: string) => fixtures.find((path) => path.endsWith(name))
const konove = find('konove-save-game.sav')
const mithro06 = find('mithro-06-maximum-cycle-4770.sav')
const load = (path: string) => parseSave(readFileSync(path))
const body = (save: SaveGame) => writeSaveParts(save).body.slice()

const impactor = (save: SaveGame) => save.gameObjects.find((g) => g.name === 'LargeImpactor')!
const machine = (save: SaveGame) =>
  impactor(save).gameObjects[0]!.behaviors.find((b) => b.name === 'StateMachineController')!
const event = (save: SaveGame) =>
  (
    save.gameObjects
      .find((g) => g.name === 'SaveGame')!
      .gameObjects[0]!.behaviors.find((b) => b.name === 'GameplayEventManager')!.templateData as {
      activeEvents: { eventStartTime: number }[]
    }
  ).activeEvents[0]!

describe.skipIf(!konove)('Demolior (Konove, Spaced Out)', () => {
  const save = () => load(konove!)

  test('reads the event, difficulty, impact cycle and health', () => {
    const view = readDemolior(save())!
    // GameClock: cycle 67 + 343.97 s of 600 + 1, as GameUtil.GetCurrentTimeInCycles.
    expect(view.currentCycle).toBeCloseTo(67 + 343.9691467285156 / 600 + 1, 4)
    expect(view.eventStartCycle).toBeCloseTo(1.0834444761276245, 6)
    expect(view.difficulty).toEqual({ id: 'Default', name: 'Default' })
    // GetImpactTime(): 200 cycles at Default, and the arrival stored in the state machine agrees.
    expect(view.durationSource).toBe('difficulty')
    expect(view.durationCycles).toBe(200)
    expect(view.impactCycle).toBeCloseTo(1.0834444761276245 + 200, 4)
    expect(view.remainingCycles).toBeCloseTo(view.impactCycle - view.currentCycle, 6)
    expect(view.health).toEqual({ current: 960, max: 1000 })
    expect(view.travels).toBe(true)
    expect(view.editable).toBe(true)
    expect(view.minImpactCycle).toBeCloseTo(view.currentCycle + MIN_CYCLES_BEFORE_IMPACT, 6)
  })

  test('postponing changes only eventStartTime, ArrivalTime and Speed', () => {
    const before = save()
    const after = save()
    const view = readDemolior(before)!
    applyEdit(after, { type: 'setDemoliorImpact', impactCycle: view.impactCycle + 50 })

    const changed = changedPaths(before, after)
    expect(changed).toHaveLength(2)
    expect(changed.some((p) => p.endsWith('activeEvents.0.eventStartTime'))).toBe(true)
    expect(changed.some((p) => p.endsWith('.extraRaw'))).toBe(true)

    expect(event(after).eventStartTime).toBeCloseTo(event(before).eventStartTime + 50, 4)
    // Inside the state machine blob only the 8 bytes of ArrivalTime and Speed differ.
    const a = machine(before).extraRaw
    const b = machine(after).extraRaw
    expect(b.length).toBe(a.length)
    const diff = [...a.keys()].filter((i) => a[i] !== b[i])
    expect(diff.length).toBeGreaterThan(0)
    expect(diff.length).toBeLessThanOrEqual(8)
    expect(diff[diff.length - 1]! - diff[0]!).toBeLessThan(8)

    // Reading the written file back gives the new impact; the hexes still to fly stay the same.
    const reread = roundTrip(after)
    const next = readDemolior(reread)!
    expect(next.impactCycle).toBeCloseTo(view.impactCycle + 50, 3)
    // Hexes left = Speed x seconds left / 600 (ClusterTraveler.TravelETA), unchanged by the edit.
    const hexes = (s: SaveGame, v: NonNullable<typeof view>) =>
      (demoliorTravel(s)!.speed * v.remainingCycles) / 1
    expect(hexes(reread, next)).toBeCloseTo(hexes(before, view), 3)
    expect(demoliorTravel(reread)!.arrivalTime).toBeCloseTo(
      demoliorTravel(before)!.arrivalTime + 50 * 600,
      -1,
    )
  })

  test('an impact in the past clamps to one cycle from now', () => {
    const s = save()
    const view = readDemolior(s)!
    expect(clampImpact(s, 3)).toBeCloseTo(view.currentCycle + MIN_CYCLES_BEFORE_IMPACT, 6)
    applyEdit(s, { type: 'setDemoliorImpact', impactCycle: 3 })
    const next = readDemolior(s)!
    expect(next.impactCycle).toBeCloseTo(view.minImpactCycle, 3)
    expect(next.remainingCycles).toBeCloseTo(MIN_CYCLES_BEFORE_IMPACT, 3)
    expect(describeEdit(save(), { type: 'setDemoliorImpact', impactCycle: 3 })).toContain(
      String(Math.round(view.minImpactCycle * 100) / 100).split('.')[0],
    )
  })

  test('undo restores every byte', () => {
    const s = save()
    const original = body(s)
    const undo = applyWithRestore(s, { type: 'setDemoliorImpact', impactCycle: 400 })
    expect(sameBytes(body(s), original)).toBe(false)
    undo()
    expect(sameBytes(body(s), original)).toBe(true)
  })

  test('refuses to edit a state machine blob it cannot read, and leaves the save alone', () => {
    const s = save()
    const behavior = machine(s)
    behavior.extraRaw = behavior.extraRaw.slice(0, 40)
    const view = readDemolior(s)!
    expect(view.editable).toBe(false)
    expect(view.health).toBeNull()
    const before = body(s)
    expect(() => applyEdit(s, { type: 'setDemoliorImpact', impactCycle: 400 })).toThrow()
    expect(sameBytes(body(s), before)).toBe(true)
  })

  test('without a ClusterTraveler (vanilla) only eventStartTime changes', () => {
    const before = save()
    const after = save()
    const obj = impactor(after).gameObjects[0]!
    obj.behaviors = obj.behaviors.filter((b) => b.name !== 'ClusterTraveler')
    const vanilla = readDemolior(after)!
    expect(vanilla.travels).toBe(false)
    const copy = after
    const raw = machine(copy).extraRaw.slice()
    applyEdit(after, { type: 'setDemoliorImpact', impactCycle: vanilla.impactCycle + 10 })
    expect(machine(after).extraRaw).toEqual(raw)
    expect(event(after).eventStartTime).toBeCloseTo(event(before).eventStartTime + 10, 4)
  })
})

describe('Demolior on every fixture', () => {
  test('is only present with DLC4 and an active LargeImpactor event', () => {
    for (const path of fixtures) {
      const save = load(path)
      const view = readDemolior(save)
      if (view) {
        expect(save.header.gameInfo.dlcIds).toContain('DLC4_ID')
        expect(view.impactCycle).toBeGreaterThan(view.eventStartCycle)
        expect(Number.isFinite(view.remainingCycles)).toBe(true)
      }
    }
  }, 120_000)
})

describe('world mixing', () => {
  test('lists every saved level with a readable name, on every fixture that has them', () => {
    let seen = 0
    for (const path of fixtures) {
      const save = load(path)
      const saved = (
        save.gameData.customGameSettings as { CurrentMixingLevelsBySetting?: [string, string][] }
      ).CurrentMixingLevelsBySetting
      const mixing = readMixing(save)
      if (!saved) {
        expect(mixing, path).toBeNull()
        continue
      }
      seen++
      expect(mixing!.entries.map((e) => [e.id, e.level])).toEqual(saved)
      for (const entry of mixing!.entries) {
        expect(entry.name, entry.id).not.toMatch(/Mixing$|_ID$/)
        expect(['Disabled', 'Enabled', 'Try mixing', 'Guaranteed']).toContain(entry.levelName)
      }
    }
    expect(seen).toBeGreaterThan(0)
  }, 120_000)

  test('names the DLC and world entries', () => {
    const save = load(fixtures.find((p) => p.endsWith('beautiful-galaxy.sav'))!)
    const entries = readMixing(save)!.entries
    const byId = Object.fromEntries(entries.map((e) => [e.id, e]))
    expect(byId.DLC4_ID).toMatchObject({ kind: 'dlc', name: 'Prehistoric Planet Pack' })
    expect(byId.CeresAsteroidMixing).toMatchObject({ kind: 'world', name: 'Ceres Asteroid' })
    expect(byId.IceCavesMixing).toMatchObject({ kind: 'subworld', name: 'Ice Caves' })
    expect(byId.DLC2_ID).toMatchObject({ level: 'Enabled', levelName: 'Enabled' })
  })

  test('is read only: the page view has no edit for it', () => {
    const save = load(fixtures[0]!)
    const view = listDlc(save)
    expect(Object.keys(view).sort()).toEqual(['demolior', 'dlcIds', 'geothermal', 'mixing'])
  })
})

describe.skipIf(!mithro06)('geothermal (mithro-06)', () => {
  test('reads the controller state and each vent', () => {
    const view = readGeothermal(load(mithro06!))!
    expect(view.stateIndex).toBe(6)
    expect(view.state).toBe('Complete')
    expect(view.vents).toHaveLength(3)
    expect(view.vents.map((v) => v.progress)).toEqual(['Complete', 'Complete', 'Complete'])
    expect(view.vents[0]!.recentMass).toBeCloseTo(4412.59765625, 3)
    expect(view.vents[1]!.recentMass).toBeCloseTo(4170.6201171875, 3)
    expect(view.vents[2]!.recentMass).toBeCloseTo(4754.783203125, 3)
    expect(view.vents.every((v) => v.availableItems === 0 && v.availableMass === 0)).toBe(true)
  }, 120_000)
})

describe('geothermal on every fixture', () => {
  test('only appears with DLC2 and reads cleanly', () => {
    for (const path of fixtures) {
      const save = load(path)
      const view = readGeothermal(save)
      if (view) {
        expect(save.header.gameInfo.dlcIds ?? [save.header.gameInfo.dlcId]).toContain('DLC2_ID')
        expect(view.state).not.toMatch(/^Unknown/)
        for (const vent of view.vents) expect(vent.progress).not.toMatch(/^Unknown/)
      }
    }
  }, 120_000)
})
