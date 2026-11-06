import { readFileSync } from 'node:fs'
import { afterEach, beforeAll, describe, expect, test } from 'vite-plus/test'
import { parseSave, type SaveGame } from '@oni-duplicity/save-parser'
import { seedCoordinate } from '../src/worker/coordinate/coordinate.ts'
import { CLUSTER_PREFIXES } from '../src/worker/coordinate/cluster-prefixes.ts'
import { setQualityLevel } from '../src/worker/game-settings.ts'
import { fixtures } from './helpers.ts'

const path = (name: string) => fixtures.find((p) => p.endsWith(name))
const MID = 'mithro-04-advanced-cycle-1434.sav'

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
  // Each fixture is parsed once, here: the 30 and 40 MB saves take seconds each, and a shared
  // runner is several times slower than a laptop. Only the one save the tests below change stays
  // in memory; the others are dropped as soon as their coordinate is read.
  const found = new Map<string, string | undefined>()
  let mid: SaveGame | null = null
  let midSettings: unknown
  beforeAll(() => {
    for (const [file] of CASES) {
      const p = path(file)
      if (!p) continue
      const save = parseSave(readFileSync(p))
      found.set(file, seedCoordinate(save)?.coordinate)
      if (file === MID) {
        mid = save
        midSettings = structuredClone(save.gameData.customGameSettings)
      }
    }
  }, 180_000)
  // The tests below edit the shared save's settings; each one starts from the parsed values.
  afterEach(() => {
    if (mid) mid.gameData.customGameSettings = structuredClone(midSettings) as never
  })

  for (const [file, coordinate] of CASES) {
    test.skipIf(!path(file))(`${file} is ${coordinate}`, () => {
      expect(found.get(file)).toBe(coordinate)
    })
  }

  test.skipIf(!path(MID))('splits into the game parts', () => {
    expect(seedCoordinate(mid!)).toEqual({
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

  test.skipIf(!path(MID))('follows the saved difficulty', () => {
    const save = mid!
    setQualityLevel(save, 'CalorieBurn', 'Default')
    expect(seedCoordinate(save)?.settingsCode).toBe('0')
    setQualityLevel(save, 'CalorieBurn', 'VeryHard')
    // GetCurrentQualitySetting: survival mode ignores the stored levels.
    expect(seedCoordinate(save)?.settingsCode).not.toBe('0')
    ;(save.gameData.customGameSettings as { customGameMode: number }).customGameMode = 0
    expect(seedCoordinate(save)?.settingsCode).toBe('0')
  })

  test.skipIf(!path(MID))('gives nothing it cannot derive', () => {
    const save = mid!
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
