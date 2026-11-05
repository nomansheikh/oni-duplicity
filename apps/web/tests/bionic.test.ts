import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseSave, type SaveGame } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { boosterSlotNumber, listBionics } from '../src/worker/bionic.ts'

const testData = fileURLToPath(new URL('../../../test-data/', import.meta.url))
// The only fixture with bionic duplicants is in the full tier (40 MB, fetched on demand).
const bionicSave = `${testData}fetched/mithro-06-maximum-cycle-4770.sav`
const small = `${testData}saves/beautiful-galaxy.sav`

// Where the fixture must exist (full-tier CI), a missing file fails instead of skipping.
const required = Boolean(process.env.CI) && process.env.FIXTURE_TIER === 'all'
const haveBionicSave = existsSync(bionicSave)
const full = test.skipIf(!haveBionicSave && !required)

test('slot ids map to slot numbers 1 to 8', () => {
  expect(boosterSlotNumber('BionicUpgrade')).toBe(1)
  expect(boosterSlotNumber('BionicUpgrade2')).toBe(2)
  expect(boosterSlotNumber('BionicUpgrade8')).toBe(8)
  expect(boosterSlotNumber('BionicUpgrade9')).toBeNull()
  expect(boosterSlotNumber('BionicUpgrade1')).toBeNull()
  expect(boosterSlotNumber('Something')).toBeNull()
  expect(boosterSlotNumber(undefined)).toBeNull()
})

test('a save without bionics, remote workers or docks gives empty lists', () => {
  const view = listBionics(parseSave(readFileSync(small)))
  expect(view).toEqual({ duplicants: [], remoteWorkers: [], remoteDocks: [] })
})

full(
  'installed boosters are listed per slot',
  () => {
    expect(haveBionicSave, 'full-tier fixture missing').toBe(true)
    const { duplicants } = listBionics(parseSave(readFileSync(bionicSave)))
    expect(duplicants.map((d) => d.id)).toEqual([
      'BionicMinion:0',
      'BionicMinion:1',
      'BionicMinion:2',
    ])
    for (const d of duplicants) {
      expect(d.boosters.map((b) => b.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
      expect(d.boosters.every((b) => b.prefab.startsWith('Booster_'))).toBe(true)
    }
    expect(duplicants[0]!.boosters.map((b) => b.prefab)).toEqual([
      'Booster_Op1',
      'Booster_Suits1',
      'Booster_Tidy1',
      'Booster_Op1',
      'Booster_Carry1',
      'Booster_Carry1',
      'Booster_Construct1',
      'Booster_Construct1',
    ])
  },
  300_000,
)

full(
  'electrobanks carry their charge in joules, empty ones none',
  () => {
    expect(haveBionicSave, 'full-tier fixture missing').toBe(true)
    const { duplicants } = listBionics(parseSave(readFileSync(bionicSave)))
    const banks = duplicants[0]!.electrobanks
    expect(banks).toHaveLength(6)
    expect(banks[0]).toEqual({ prefab: 'EmptyElectrobank', charge: null })
    expect(banks[1]!.charge).toBeCloseTo(89163.3125, 3)
    expect(banks.slice(2).map((b) => b.charge)).toEqual([120000, 120000, 120000, 120000])
    for (const d of duplicants) {
      for (const bank of d.electrobanks) {
        if (bank.charge !== null) {
          expect(bank.charge).toBeGreaterThanOrEqual(0)
          expect(bank.charge).toBeLessThanOrEqual(120000)
        }
      }
    }
  },
  300_000,
)

full(
  'remote workers are matched to their docks and report their charge',
  () => {
    expect(haveBionicSave, 'full-tier fixture missing').toBe(true)
    const { remoteWorkers, remoteDocks } = listBionics(parseSave(readFileSync(bionicSave)))
    expect(remoteWorkers).toHaveLength(30)
    expect(remoteDocks).toHaveLength(30)
    expect(remoteWorkers.every((w) => w.dockId !== null && w.capacity === 60)).toBe(true)
    expect(remoteWorkers.every((w) => w.charge !== null && w.charge >= 0 && w.charge <= 60)).toBe(
      true,
    )
    const first = remoteDocks[0]!
    expect(first.name).toBe('Misson Control Bot')
    expect(remoteWorkers.find((w) => w.id === first.workerId)!.dockId).toBe(first.id)
  },
  300_000,
)

full(
  'reading the bionic view leaves the save untouched',
  () => {
    expect(haveBionicSave, 'full-tier fixture missing').toBe(true)
    const bytes = readFileSync(bionicSave)
    const save: SaveGame = parseSave(bytes)
    const before = JSON.stringify(save.gameObjects.find((g) => g.name === 'BionicMinion'))
    listBionics(save)
    expect(JSON.stringify(save.gameObjects.find((g) => g.name === 'BionicMinion'))).toBe(before)
  },
  300_000,
)
