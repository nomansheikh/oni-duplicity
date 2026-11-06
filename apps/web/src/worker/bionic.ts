import type { Behavior, GameObject, SaveGame } from '@oni-duplicity/save-parser'
import {
  BOOSTER_SLOT_COUNT,
  ELECTROBANK_CAPACITY_J,
  REMOTE_WORKER_CAPACITY_J,
  type BionicOverview,
  type BionicView,
  type BoosterView,
} from './bionic-types.ts'

export * from './bionic-types.ts'

/** A game object saved inside a storage; it carries its prefab name. */
type StoredItem = GameObject & { name: string }

/** Base of the `BionicBoosterSlots` attribute (decompile: `Database/Attributes.cs`). */
export const BASE_BOOSTER_SLOTS = 2
/** Base of the `BionicBatteryCountCapacity` attribute. */
export const BASE_BATTERY_CAPACITY = 4

/** Slots each skill adds through its `ExtraBionicBooster*` perk (`Database/Skills.cs`). */
const SLOT_PERKS: Record<string, number> = {
  BionicsA1: 1,
  BionicsA2: 1,
  BionicsA3: 2,
  BionicsB2: 1,
  BionicsC2: 1,
}
/** Banks added by the `ExtraBionicBatteries` perk of `BionicsC3`. */
const EXTRA_BATTERIES = 2

const BOOSTER_SLOT_PREFIX = 'BionicUpgrade'

function find(obj: GameObject, name: string): Behavior | undefined {
  return obj.behaviors.find((b) => b.name === name)
}

/** Items held by one of the object's `Storage` components. */
function storedItems(storage: Behavior | undefined): StoredItem[] {
  return Array.isArray(storage?.extraData) ? (storage.extraData as StoredItem[]) : []
}

/** `BionicUpgrade` → 1, `BionicUpgrade3` → 3; anything else → null. */
export function boosterSlotNumber(slotInstanceId: unknown): number | null {
  if (typeof slotInstanceId !== 'string' || !slotInstanceId.startsWith(BOOSTER_SLOT_PREFIX)) {
    return null
  }
  const suffix = slotInstanceId.slice(BOOSTER_SLOT_PREFIX.length)
  if (suffix === '') return 1
  const n = Number(suffix)
  return Number.isInteger(n) && n >= 2 && n <= BOOSTER_SLOT_COUNT ? n : null
}

function instanceId(obj: GameObject): number | undefined {
  const id = find(obj, 'KPrefabID')?.templateData?.InstanceID
  return typeof id === 'number' ? id : undefined
}

function masteredSkills(obj: GameObject): Set<string> {
  const entries = find(obj, 'MinionResume')?.templateData?.MasteryBySkillID
  const mastered = new Set<string>()
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      if (Array.isArray(entry) && typeof entry[0] === 'string' && entry[1] === true) {
        mastered.add(entry[0])
      }
    }
  }
  return mastered
}

export function unlockedSlotCount(mastered: Set<string>): number {
  let total = BASE_BOOSTER_SLOTS
  for (const [skill, slots] of Object.entries(SLOT_PERKS)) if (mastered.has(skill)) total += slots
  return Math.min(BOOSTER_SLOT_COUNT, Math.max(0, total))
}

export function batteryCapacity(mastered: Set<string>): number {
  return BASE_BATTERY_CAPACITY + (mastered.has('BionicsC3') ? EXTRA_BATTERIES : 0)
}

function internalBatteryOf(obj: GameObject): BionicView['internalBattery'] {
  const modifiers = (find(obj, 'MinionModifiers') ?? find(obj, 'Klei.AI.Modifiers'))?.extraData as
    | { amounts?: { name: string; value: { value?: unknown } }[] }
    | undefined
  const amount = modifiers?.amounts?.find((a) => a.name === 'BionicInternalBattery')
  const charge = Number(amount?.value?.value)
  return amount && Number.isFinite(charge) ? { charge, max: 0 } : null
}

function bionicOf(id: string, obj: GameObject): BionicView {
  const boosters: BoosterView[] = []
  const storages = obj.behaviors.filter((b) => b.name === 'Storage')
  // The prefab adds, in order: the default storage, then the battery, upgrade and oxygen tank
  // storages. The storage ids are not saved, so the battery storage is taken to be the second
  // one, and only when everything in it is an electrobank. Boosters are found by their
  // component, wherever they are stored.
  for (const storage of storages) {
    for (const item of storedItems(storage)) {
      const component = find(item, 'BionicUpgradeComponent')
      if (!component) continue
      const slot = boosterSlotNumber(component.templateData?.assignee_slotInstanceID)
      if (slot !== null && item.name) boosters.push({ slot, prefab: item.name })
    }
  }
  boosters.sort((a, b) => a.slot - b.slot)

  const batteryItems = storedItems(storages[1])
  const electrobanks = batteryItems.every((item) => /Electrobank/.test(item.name))
    ? batteryItems.map((item) => {
        const charge = find(item, 'Electrobank')?.templateData?.charge
        return { prefab: item.name, charge: typeof charge === 'number' ? charge : null }
      })
    : null

  const mastered = masteredSkills(obj)
  const capacity = batteryCapacity(mastered)
  const battery = internalBatteryOf(obj)
  return {
    id,
    boosters,
    slotCount: BOOSTER_SLOT_COUNT,
    unlockedSlots: unlockedSlotCount(mastered),
    electrobanks,
    batteryCapacity: capacity,
    // `BionicBatteryMonitor` raises the base maximum (4 banks) by one bank's worth per extra bank.
    internalBattery: battery && { charge: battery.charge, max: ELECTROBANK_CAPACITY_J * capacity },
  }
}

function groupObjects(save: SaveGame, prefab: string): { id: string; obj: GameObject }[] {
  const group = save.gameObjects.find((g) => g.name === prefab)
  return (group?.gameObjects ?? []).map((obj, index) => ({ id: `${prefab}:${index}`, obj }))
}

/**
 * Read-only view of the bionic-only data: installed boosters per slot, the electrobanks in each
 * bionic's battery storage, and the remote workers and docks. Nothing here writes to the save.
 */
export function listBionics(save: SaveGame): BionicOverview {
  const duplicants = groupObjects(save, 'BionicMinion').map(({ id, obj }) => bionicOf(id, obj))

  const docks = groupObjects(save, 'RemoteWorkerDock')
  const workers = groupObjects(save, 'RemoteWorker')
  const workerById = new Map<number, string>()
  for (const w of workers) {
    const iid = instanceId(w.obj)
    if (iid !== undefined) workerById.set(iid, w.id)
  }

  const dockOfWorker = new Map<string, string>()
  const remoteDocks = docks.map(({ id, obj }) => {
    const ref = (find(obj, 'RemoteWorkerDock')?.templateData?.worker ?? null) as {
      id?: number
    } | null
    const workerId = ref && typeof ref.id === 'number' ? (workerById.get(ref.id) ?? null) : null
    if (workerId) dockOfWorker.set(workerId, id)
    const name = find(obj, 'UserNameable')?.templateData?.savedName
    return { id, name: typeof name === 'string' && name !== '' ? name : null, workerId }
  })

  const remoteWorkers = workers.map(({ id, obj }) => {
    const charge = find(obj, 'RemoteWorkerCapacitor')?.templateData?.charge
    const docked = find(obj, 'RemoteWorkerSM')?.templateData?.docked
    return {
      id,
      dockId: dockOfWorker.get(id) ?? null,
      docked: typeof docked === 'boolean' ? docked : null,
      charge: typeof charge === 'number' ? charge : null,
      capacity: REMOTE_WORKER_CAPACITY_J,
    }
  })

  return { duplicants, remoteWorkers, remoteDocks }
}
