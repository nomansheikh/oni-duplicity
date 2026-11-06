import { describe, expect, test } from 'vite-plus/test'
import { demoliorTravel, readDemolior } from '../src/worker/dlc.ts'
import { applyEdit } from '../src/worker/model.ts'
import { enc, impactor, synthetic } from './dlc-helpers.ts'

describe('Demolior layouts (synthetic saves)', () => {
  test('a healthy Spaced Out impactor reads and edits', () => {
    const s = synthetic()
    const view = readDemolior(s)!
    expect(view).toMatchObject({
      eventStartCycle: 2,
      durationCycles: 200,
      impactCycle: 202,
      durationSource: 'difficulty',
      arrivalSaved: true,
      editable: true,
      health: { current: 900, max: 1000 },
    })
    expect(view.currentCycle).toBeCloseTo(10 + 0.5 + 1, 6)
    applyEdit(s, { type: 'setDemoliorImpact', impactCycle: 252 })
    const next = readDemolior(s)!
    expect(next.impactCycle).toBeCloseTo(252, 4)
    expect(demoliorTravel(s)!.arrivalTime).toBeCloseTo(252 * 600, -1)
    // Speed scales by old over new time left: (202 - 11.5) / (252 - 11.5).
    expect(demoliorTravel(s)!.speed).toBeCloseTo((0.05 * (202 - 11.5)) / (252 - 11.5), 5)
  })

  test('no Demolior without DLC4 or without an active event (destroyed or never created)', () => {
    expect(readDemolior(synthetic({ dlcIds: ['EXPANSION1_ID'] }))).toBeNull()
    expect(readDemolior(synthetic({ event: false }))).toBeNull()
  })

  test('Spaced Out without the impactor object is read only with a reason', () => {
    const s = synthetic({ impactor: false })
    const view = readDemolior(s)!
    expect(view.editable).toBe(false)
    expect(view.readOnlyReason).toMatch(/no readable flight data/)
    expect(view.health).toBeNull()
    expect(() => applyEdit(s, { type: 'setDemoliorImpact', impactCycle: 300 })).toThrow(/flight/)
  })

  test('Spaced Out without a traveler or flight machine is read only', () => {
    const noTraveler = readDemolior(synthetic({ traveler: false }))!
    expect(noTraveler.editable).toBe(false)
    expect(noTraveler.readOnlyReason).toMatch(/cluster traveler/)
    const noFlight = readDemolior(synthetic({ arrival: null }))!
    expect(noFlight.editable).toBe(false)
    expect(noFlight.arrivalSaved).toBe(false)
    expect(noFlight.health).toEqual({ current: 900, max: 1000 })
  })

  test('an impactor that already arrived is read only and has no time left', () => {
    const s = synthetic({ arrival: 5 * 600 })
    const view = readDemolior(s)!
    expect(view.editable).toBe(false)
    expect(view.readOnlyReason).toMatch(/already arrived/)
    expect(view.remainingCycles).toBeLessThan(view.durationCycles)
    expect(() => applyEdit(s, { type: 'setDemoliorImpact', impactCycle: 300 })).toThrow(/arrived/)
  })

  test('a vanilla save only shows the difficulty time and refuses the edit', () => {
    const s = synthetic({ dlcIds: ['DLC4_ID'], arrival: null, difficulty: 'VeryHard' })
    const view = readDemolior(s)!
    expect(view.durationCycles).toBe(100)
    expect(view.arrivalSaved).toBe(false)
    expect(view.editable).toBe(false)
    expect(view.readOnlyReason).toMatch(/imminent-impact tag/)
    expect(() => applyEdit(s, { type: 'setDemoliorImpact', impactCycle: 300 })).toThrow()
  })

  test('a saved arrival that differs from the difficulty (imminent cluster) wins', () => {
    const view = readDemolior(synthetic({ arrival: (2 + 10) * 600 }))!
    expect(view.durationSource).toBe('saved')
    expect(view.durationCycles).toBeCloseTo(10, 4)
    expect(view.impactCycle).toBeCloseTo(12, 4)
  })

  test('an unfamiliar state machine blob reads as unknown, not wrong', () => {
    const s = synthetic()
    const behavior = impactor(s).gameObjects[0]!.behaviors[0]!
    behavior.extraRaw = enc.encode('not a state machine blob')
    const view = readDemolior(s)!
    expect(view.health).toBeNull()
    expect(view.editable).toBe(false)
  })
})
