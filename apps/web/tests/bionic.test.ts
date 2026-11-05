import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseSave, type SaveGame } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import {
  batteryCapacity,
  boosterSlotNumber,
  listBionics,
  unlockedSlotCount,
} from '../src/worker/bionic.ts'

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
    const banks = duplicants[0]!.electrobanks!
    expect(banks).toHaveLength(6)
    expect(banks[0]).toEqual({ prefab: 'EmptyElectrobank', charge: null })
    expect(banks[1]!.charge).toBeCloseTo(89163.3125, 3)
    expect(banks.slice(2).map((b) => b.charge)).toEqual([120000, 120000, 120000, 120000])
    for (const d of duplicants) {
      for (const bank of d.electrobanks!) {
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

full(
  'unlocked slots, bank places and the internal battery come from skills and amounts',
  () => {
    expect(haveBionicSave, 'full-tier fixture missing').toBe(true)
    const { duplicants } = listBionics(parseSave(readFileSync(bionicSave)))
    for (const d of duplicants) {
      // Every slot of these duplicants holds a booster, so all of them must be unlocked.
      expect(d.unlockedSlots, d.id).toBeGreaterThanOrEqual(
        Math.max(...d.boosters.map((b) => b.slot)),
      )
      expect([4, 6]).toContain(d.batteryCapacity)
      expect(d.electrobanks!.length).toBeLessThanOrEqual(d.batteryCapacity)
      expect(d.internalBattery!.max).toBe(120000 * d.batteryCapacity)
      expect(d.internalBattery!.charge).toBeLessThanOrEqual(d.internalBattery!.max)
    }
  },
  300_000,
)

// --- Synthetic saves ------------------------------------------------------------------------

type Json = Record<string, unknown>
const behavior = (name: string, templateData: Json = {}, extraData?: unknown) =>
  ({ name, templateData, extraData, extraRaw: new Uint8Array() }) as never
const item = (name: string, behaviors: unknown[]) => ({ name, behaviors }) as never
const booster = (prefab: string, slotId: string) =>
  item(prefab, [behavior('BionicUpgradeComponent', { assignee_slotInstanceID: slotId })])
const bank = (prefab: string, charge?: unknown) =>
  item(prefab, charge === undefined ? [] : [behavior('Electrobank', { charge })])

function bionic(options: {
  skills?: string[]
  boosters?: unknown[]
  banks?: unknown[]
  battery?: unknown
}) {
  return {
    behaviors: [
      behavior('Storage', {}, []),
      behavior('Storage', {}, options.banks ?? []),
      behavior('Storage', {}, options.boosters ?? []),
      behavior('Storage', {}, []),
      behavior('MinionResume', {
        MasteryBySkillID: (options.skills ?? []).map((id) => [id, true]),
      }),
      behavior(
        'MinionModifiers',
        {},
        {
          amounts:
            options.battery === undefined
              ? []
              : [{ name: 'BionicInternalBattery', value: { value: options.battery } }],
          sicknesses: [],
        },
      ),
    ],
  }
}

const saveOf = (groups: Record<string, unknown[]>) =>
  ({
    gameObjects: Object.entries(groups).map(([name, gameObjects]) => ({ name, gameObjects })),
  }) as unknown as SaveGame

test('a bionic without boosters, skills or banks has the base slots and capacity', () => {
  const [view] = listBionics(saveOf({ BionicMinion: [bionic({})] })).duplicants
  expect(view).toMatchObject({
    id: 'BionicMinion:0',
    boosters: [],
    unlockedSlots: 2,
    batteryCapacity: 4,
    electrobanks: [],
    internalBattery: null,
  })
})

test('skills unlock slots and the battery perk adds two places, up to the limits', () => {
  expect(unlockedSlotCount(new Set(['BionicsA1']))).toBe(3)
  expect(unlockedSlotCount(new Set(['BionicsA1', 'BionicsA2', 'BionicsA3']))).toBe(6)
  expect(
    unlockedSlotCount(new Set(['BionicsA1', 'BionicsA2', 'BionicsA3', 'BionicsB2', 'BionicsC2'])),
  ).toBe(8)
  expect(unlockedSlotCount(new Set(['Mining1']))).toBe(2)
  expect(batteryCapacity(new Set())).toBe(4)
  expect(batteryCapacity(new Set(['BionicsC3']))).toBe(6)

  const [view] = listBionics(
    saveOf({ BionicMinion: [bionic({ skills: ['BionicsA1', 'BionicsC3'], battery: 600000 })] }),
  ).duplicants
  expect(view!.unlockedSlots).toBe(3)
  expect(view!.batteryCapacity).toBe(6)
  expect(view!.internalBattery).toEqual({ charge: 600000, max: 720000 })
})

test('boosters are ordered by slot and ones without a readable slot are skipped', () => {
  const [view] = listBionics(
    saveOf({
      BionicMinion: [
        bionic({
          boosters: [
            booster('Booster_Dig1', 'BionicUpgrade3'),
            booster('Booster_Op1', 'BionicUpgrade'),
            booster('Booster_Tidy1', 'BionicUpgrade99'),
          ],
        }),
      ],
    }),
  ).duplicants
  expect(view!.boosters).toEqual([
    { slot: 1, prefab: 'Booster_Op1' },
    { slot: 3, prefab: 'Booster_Dig1' },
  ])
})

test('a missing or non-numeric charge reads as none', () => {
  const [view] = listBionics(
    saveOf({
      BionicMinion: [
        bionic({
          banks: [
            bank('Electrobank', 1000),
            bank('Electrobank', 'lots'),
            bank('Electrobank'),
            bank('EmptyElectrobank'),
          ],
          battery: 'x',
        }),
      ],
    }),
  ).duplicants
  expect(view!.electrobanks!.map((b) => b.charge)).toEqual([1000, null, null, null])
  expect(view!.internalBattery).toBeNull()
})

test('a battery storage holding something else is reported as unknown', () => {
  const [view] = listBionics(
    saveOf({ BionicMinion: [bionic({ banks: [bank('Electrobank', 5), item('Oxygen', [])] })] }),
  ).duplicants
  expect(view!.electrobanks).toBeNull()
})

test('a dock that points at a worker the save lacks has no worker', () => {
  const worker = (iid: number, charge: unknown) => ({
    behaviors: [
      behavior('KPrefabID', { InstanceID: iid }),
      behavior('RemoteWorkerCapacitor', { charge }),
      behavior('RemoteWorkerSM', { docked: true }),
    ],
  })
  const dock = (ref: unknown) => ({ behaviors: [behavior('RemoteWorkerDock', { worker: ref })] })
  const result = listBionics(
    saveOf({
      RemoteWorker: [worker(10, 30), worker(11, 'x')],
      RemoteWorkerDock: [dock({ id: 10 }), dock({ id: 999 }), dock(null)],
    }),
  )
  expect(result.remoteDocks.map((d) => d.workerId)).toEqual(['RemoteWorker:0', null, null])
  expect(result.remoteWorkers).toMatchObject([
    { dockId: 'RemoteWorkerDock:0', charge: 30 },
    { dockId: null, charge: null },
  ])
})
