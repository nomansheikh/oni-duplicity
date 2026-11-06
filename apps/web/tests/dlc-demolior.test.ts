import { describe, expect, test } from 'vite-plus/test'
import {
  clampImpact,
  demoliorTravel,
  readDemolior,
  MIN_CYCLES_BEFORE_IMPACT,
} from '../src/worker/dlc.ts'
import { applyEdit } from '../src/worker/model.ts'
import { describeEdit } from '../src/worker/describe.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import type { SaveGame } from '@oni-duplicity/save-parser'
import { body, event, impactor, konove, load, machine } from './dlc-helpers.ts'
import { changedPaths, fixtures, roundTrip, sameBytes } from './helpers.ts'

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
    expect(view.arrivalSaved).toBe(true)
    expect(view.editable).toBe(true)
    expect(view.readOnlyReason).toBeNull()
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

  test('without a ClusterTraveler the edit is refused and nothing changes', () => {
    const s = save()
    const obj = impactor(s).gameObjects[0]!
    obj.behaviors = obj.behaviors.filter((b) => b.name !== 'ClusterTraveler')
    const view = readDemolior(s)!
    expect(view.editable).toBe(false)
    expect(view.readOnlyReason).toMatch(/cluster traveler/)
    const before = body(s)
    expect(() => applyEdit(s, { type: 'setDemoliorImpact', impactCycle: 400 })).toThrow()
    expect(sameBytes(body(s), before)).toBe(true)
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
