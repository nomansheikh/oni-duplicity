import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vite-plus/test'
import { parseSave, type SaveGame } from '@oni-duplicity/save-parser'
import { seedCoordinate } from '../src/worker/coordinate/coordinate.ts'
import { CLUSTER_PREFIXES } from '../src/worker/coordinate/cluster-prefixes.ts'
import { setQualityLevel } from '../src/worker/game-settings.ts'
import { fixtures } from './helpers.ts'

const load = (name: string): SaveGame | null => {
  const path = fixtures.find((p) => p.endsWith(name))
  return path ? parseSave(readFileSync(path)) : null
}

// Expected values are worked out by hand from the decompile: `GetSettingsCoordinate` joins
// prefix, seed and three codes; each code is a mixed-radix number written in base 36, least
// significant digit first. Mixing digits are radix 5 in `OnPrefabInit` order.
const CASES: [string, string][] = [
  // Spaced Out, all DLC, survival mode: difficulty is all default; DLC2, DLC3 and DLC4 mixing on.
  ['beautiful-galaxy.sav', 'AQU-C-1393183751-0-0-J5XRH4Y1'],
  ['beautiful-galaxy-build-744825.sav', 'AQU-C-1393183751-0-0-J5XRH4Y1'],
  ['apple-park.sav', 'AQU-C-1979165461-0-0-J5XRH4Y1'],
  ['konove-save-game.sav', 'V-PRE-C-951788799-0-0-6YLYB4Y1'],
  // Custom mode: Calorie Burn Hard is the only change, so the code is that digit in radix 8.
  ['mithro-04-advanced-cycle-1434.sav', 'SNDST-C-817651642-CTY70D-0-0'],
  // Custom mode with five hard settings; the base game keeps its Durability value order.
  ['mithro-01-early-game-cycle-010.sav', 'CER-A-789493766-47CL7A4-0-0'],
  ['mithro-06-maximum-cycle-4770.sav', 'CER-A-789493766-47CL7A4-0-0'],
  // The base game: Durability's Indestructible default is value 0 there.
  ['mithro-02-mid-game-cycle-148.sav', 'SNDST-A-1282039531-0-0-0'],
  ['mithro-03-late-game-cycle-1160.sav', 'SNDST-A-1085992072-0-0-0'],
]

describe('seed coordinate', () => {
  for (const [file, coordinate] of CASES) {
    test.skipIf(!fixtures.some((p) => p.endsWith(file)))(`${file} is ${coordinate}`, () => {
      expect(seedCoordinate(load(file)!)?.coordinate).toBe(coordinate)
    })
  }

  test.skipIf(!load('mithro-04-advanced-cycle-1434.sav'))('splits into the game parts', () => {
    expect(seedCoordinate(load('mithro-04-advanced-cycle-1434.sav')!)).toEqual({
      coordinate: 'SNDST-C-817651642-CTY70D-0-0',
      clusterId: 'expansion1::clusters/SandstoneStartCluster',
      prefix: 'SNDST-C',
      seed: '817651642',
      settingsCode: 'CTY70D',
      storyCode: '0',
      mixingCode: '0',
      storyTraitsKnown: false,
    })
  })

  test.skipIf(!load('mithro-04-advanced-cycle-1434.sav'))('follows the saved difficulty', () => {
    const save = load('mithro-04-advanced-cycle-1434.sav')!
    setQualityLevel(save, 'CalorieBurn', 'Default')
    expect(seedCoordinate(save)?.settingsCode).toBe('0')
    setQualityLevel(save, 'CalorieBurn', 'VeryHard')
    // GetCurrentQualitySetting: survival mode ignores the stored levels.
    expect(seedCoordinate(save)?.settingsCode).not.toBe('0')
    ;(save.gameData.customGameSettings as { customGameMode: number }).customGameMode = 0
    expect(seedCoordinate(save)?.settingsCode).toBe('0')
  })

  test.skipIf(!load('mithro-04-advanced-cycle-1434.sav'))('gives nothing it cannot derive', () => {
    const save = load('mithro-04-advanced-cycle-1434.sav')!
    const levels = (
      save.gameData.customGameSettings as { CurrentQualityLevelsBySetting: [string, string][] }
    ).CurrentQualityLevelsBySetting
    setQualityLevel(save, 'Morale', 'NotALevel')
    expect(seedCoordinate(save)).toBeNull()
    setQualityLevel(save, 'Morale', 'Default')
    levels.find(([id]) => id === 'ClusterLayout')![1] = 'mods::clusters/Unknown'
    expect(seedCoordinate(save)).toBeNull()
  })

  test('has a prefix for every cluster id shape a save stores', () => {
    for (const id of Object.keys(CLUSTER_PREFIXES)) expect(id).toMatch(/^([a-z0-9]+::)?clusters\//)
  })
})
