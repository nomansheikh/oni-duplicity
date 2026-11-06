import type { SaveGame } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { batteryCapacity, listBionics, unlockedSlotCount } from '../src/worker/bionic.ts'

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
