import type { Behavior, GameObject, SaveGame } from '@oni-duplicity/save-parser'

/** `Electrobank.capacity`, in joules (decompile: `private static float capacity = 120000f`). */
export const ELECTROBANK_CAPACITY_J = 120000
/** `RemoteWorkerCapacitor.CAPACITY_J`. */
export const REMOTE_WORKER_CAPACITY_J = 60
/** `BionicUpgradesMonitor.MAX_POSSIBLE_SLOT_COUNT`. */
export const BOOSTER_SLOT_COUNT = 8

export interface BoosterView {
  /** 1-based; the game names the slots `BionicUpgrade`, `BionicUpgrade2` … `BionicUpgrade8`. */
  slot: number
  /** Prefab id, e.g. `Booster_Dig1`. */
  prefab: string
}

export interface ElectrobankView {
  /** Prefab id: `Electrobank` (charged), `EmptyElectrobank`, `GarbageElectrobank`, … */
  prefab: string
  /** Joules, or null when the item has no decoded `Electrobank` behavior. */
  charge: number | null
}

export interface BionicView {
  /** Same id as the duplicant list uses (`BionicMinion:<index>`). */
  id: string
  /** Installed boosters, ordered by slot. Boosters that only wait on the floor are not listed. */
  boosters: BoosterView[]
  /** Slots the game could ever hold (always 8); how many are unlocked is not saved directly. */
  slotCount: number
  /** Electrobanks in the duplicant's battery storage. */
  electrobanks: ElectrobankView[]
}

export interface RemoteWorkerView {
  /** `RemoteWorker:<index>`. */
  id: string
  /** Dock the worker is assigned to, or null when no dock refers to it. */
  dockId: string | null
  docked: boolean | null
  charge: number | null
  capacity: number
}

export interface RemoteDockView {
  id: string
  /** Custom name, when the player renamed the dock. */
  name: string | null
  /** The worker this dock refers to, or null when it has none. */
  workerId: string | null
}

export interface BionicOverview {
  duplicants: BionicView[]
  remoteWorkers: RemoteWorkerView[]
  remoteDocks: RemoteDockView[]
}

/** A game object saved inside a storage; it carries its prefab name. */
type StoredItem = GameObject & { name: string }

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

function bionicOf(id: string, obj: GameObject): BionicView {
  const boosters: BoosterView[] = []
  const electrobanks: ElectrobankView[] = []
  const storages = obj.behaviors.filter((b) => b.name === 'Storage')
  // The prefab adds, in order: the default storage, then the battery, upgrade and oxygen tank
  // storages. The storage ids are not saved, so the battery storage is the second one and the
  // boosters are found by their component, wherever they are stored.
  storages.forEach((storage, index) => {
    for (const item of storedItems(storage)) {
      const component = find(item, 'BionicUpgradeComponent')
      if (component) {
        const slot = boosterSlotNumber(component.templateData?.assignee_slotInstanceID)
        const prefab = item.name
        if (slot !== null && prefab) boosters.push({ slot, prefab })
      } else if (index === 1) {
        const bank = find(item, 'Electrobank')
        const charge = bank?.templateData?.charge
        electrobanks.push({
          prefab: item.name,
          charge: typeof charge === 'number' ? charge : null,
        })
      }
    }
  })
  boosters.sort((a, b) => a.slot - b.slot)
  return { id, boosters, slotCount: BOOSTER_SLOT_COUNT, electrobanks }
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
