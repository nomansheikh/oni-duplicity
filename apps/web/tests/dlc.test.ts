import { readFileSync } from 'node:fs'
import { hashString } from '@oni-duplicity/game-data'
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

// --- Synthetic saves: the layout logic without any fixture ---------------------------------

const enc = new TextEncoder()
const i32 = (n: number) => {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setInt32(0, n, true)
  return b
}
const f32 = (n: number) => {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setFloat32(0, n, true)
  return b
}
const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}
const str = (text: string) => cat(i32(text.length), enc.encode(text))

/** `[name][-1][state][dataLen]` then the machine's own fields, then its parameters. */
function machineBytes(type: string, fields: Uint8Array, params: Uint8Array[]): Uint8Array {
  return cat(str(type), i32(-1), str('root.state'), i32(0), fields, i32(params.length), ...params)
}
function intParam(name: string, value: number): Uint8Array {
  const type = str('StateMachine`4+IntParameter+Context[[X]]')
  const inner = cat(type, str(name), i32(value))
  return cat(i32(inner.length), inner)
}

interface Synthetic {
  dlcIds?: string[]
  now?: { cycle: number; progress: number }
  start?: number
  difficulty?: string
  event?: boolean
  impactor?: boolean
  traveler?: boolean
  /** Saved arrival in seconds; null leaves the flight machine out. */
  arrival?: number | null
  speed?: number
  health?: number
}

function synthetic(o: Synthetic = {}): SaveGame {
  const {
    dlcIds = ['EXPANSION1_ID', 'DLC4_ID'],
    now = { cycle: 10, progress: 300 },
    start = 2,
    difficulty = 'Default',
    event = true,
    impactor = true,
    traveler = true,
    arrival = (start + 200) * 600,
    speed = 0.05,
    health = 900,
  } = o
  const behaviors = [
    {
      name: 'GameplayEventManager',
      templateData: {
        activeEvents: event
          ? [{ eventID: { hash: hashString('LargeImpactor') }, eventStartTime: start }]
          : [],
      },
      extraRaw: new Uint8Array(),
    },
    {
      name: 'GameClock',
      templateData: { cycle: now.cycle, timeSinceStartOfCycle: now.progress },
      extraRaw: new Uint8Array(),
    },
  ]
  const flight =
    arrival === null
      ? []
      : [
          machineBytes(
            'ClusterMapLargeImpactor+Instance',
            cat(i32(0), f32(arrival), f32(speed)),
            [],
          ),
        ]
  const blob = cat(
    machineBytes('LargeImpactorStatus+Instance', new Uint8Array(), [intParam('Health', health)]),
    ...flight,
  )
  const object = {
    behaviors: [
      { name: 'StateMachineController', templateData: {}, extraRaw: blob },
      ...(traveler
        ? [{ name: 'ClusterTraveler', templateData: {}, extraRaw: new Uint8Array() }]
        : []),
    ],
  }
  return {
    header: { gameInfo: { dlcIds } },
    gameData: {
      customGameSettings: {
        CurrentQualityLevelsBySetting: [['DemoliorDifficulty', difficulty]],
      },
    },
    gameObjects: [
      { name: 'SaveGame', gameObjects: [{ behaviors }] },
      ...(impactor ? [{ name: 'LargeImpactor', gameObjects: [object] }] : []),
    ],
  } as unknown as SaveGame
}

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
