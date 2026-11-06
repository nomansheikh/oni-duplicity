import { describe, expect, test } from 'vite-plus/test'
import { listDlc, readGeothermal, readMixing } from '../src/worker/dlc.ts'
import { load, mithro06 } from './dlc-helpers.ts'
import { fixtures } from './helpers.ts'

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
