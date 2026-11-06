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
  /** Slots the game could ever hold (always 8). */
  slotCount: number
  /** Unlocked slots: the base value plus the perks of the mastered skills, clamped to 0..8. */
  unlockedSlots: number
  /**
   * Electrobanks in the duplicant's battery storage, or null when the storage could not be
   * identified (it held something that is not an electrobank).
   */
  electrobanks: ElectrobankView[] | null
  /** How many banks the battery storage holds: the base value plus the perks, 4 or 6. */
  batteryCapacity: number
  /** The `BionicInternalBattery` amount in joules and its maximum, or null when not saved. */
  internalBattery: { charge: number; max: number } | null
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
