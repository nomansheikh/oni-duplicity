import { findGameSetting, hashString, humanize } from '@oni-duplicity/game-data'
import type { GameObject, SaveGame, TemplateData } from '@oni-duplicity/save-parser'

/**
 * DLC-only views and the one Demolior edit. Everything here follows the decompile of
 * Kupie/ONI_Decomp; each reader cites the class it mirrors.
 */

const SECONDS_PER_CYCLE = 600

// --- Shared lookups ---------------------------------------------------------

function behaviorOf(obj: GameObject, name: string) {
  return obj.behaviors.find((b) => b.name === name)
}

function groupObjects(save: SaveGame, prefab: string): GameObject[] {
  return save.gameObjects.find((g) => g.name === prefab)?.gameObjects ?? []
}

function dlcIdsOf(save: SaveGame): string[] {
  const info = save.header.gameInfo
  if (Array.isArray(info.dlcIds)) return info.dlcIds.filter((id) => id !== '')
  return info.dlcId ? [info.dlcId] : []
}

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

// --- Demolior ---------------------------------------------------------------

/** `GameplayEvents.LargeImpactor = new LargeImpactorEvent("LargeImpactor", DlcManager.DLC4, ...)`. */
const LARGE_IMPACTOR_EVENT = hashString('LargeImpactor')

/** `LargeImpactorEvent.GetImpactTime()`: cycles by the `DemoliorDifficulty` level. */
const IMPACT_CYCLES: Record<string, number> = {
  VeryEasy: 500,
  Easy: 300,
  Default: 200,
  Hard: 150,
  VeryHard: 100,
}
/** Level ids the game compares against; anything else falls through to 200 cycles. */
const DEFAULT_IMPACT_CYCLES = 200

/** An impact never lands before this many cycles from now when edited (avoids a zero divisor). */
export const MIN_CYCLES_BEFORE_IMPACT = 1

export interface DemoliorView {
  /** `GameplayEventInstance.eventStartTime`, in game cycles. */
  eventStartCycle: number
  difficulty: { id: string; name: string } | null
  /** Cycles from the event start to the impact. */
  durationCycles: number
  /** `difficulty`: the `GetImpactTime()` formula. `saved`: the arrival time the game stored. */
  durationSource: 'difficulty' | 'saved'
  /** `eventStartTime + duration`, in game cycles. */
  impactCycle: number
  /** `GameUtil.GetCurrentTimeInCycles()`: GameClock cycle + progress through it + 1. */
  currentCycle: number
  remainingCycles: number
  /** Hit points left on the impactor, when the state machine blob reads cleanly. */
  health: { current: number; max: number } | null
  /** Spaced Out saves move the impactor with a ClusterTraveler; the edit rewrites that too. */
  travels: boolean
  /** False when the saved state could not be read safely; the page then shows no edit. */
  editable: boolean
  /** The earliest impact cycle the edit accepts. */
  minImpactCycle: number
}

/** `GameUtil.GetCurrentTimeInCycles() = GameClock.GetTimeInCycles() + 1`. */
export function currentCycle(save: SaveGame): number | undefined {
  for (const g of save.gameObjects) {
    for (const obj of g.gameObjects) {
      const clock = behaviorOf(obj, 'GameClock')?.templateData
      const cycle = asNumber(clock?.cycle)
      const progress = asNumber(clock?.timeSinceStartOfCycle)
      if (cycle !== undefined && progress !== undefined) {
        return cycle + progress / SECONDS_PER_CYCLE + 1
      }
    }
  }
  return undefined
}

interface ActiveImpactor {
  event: TemplateData
  object?: GameObject
}

function activeImpactor(save: SaveGame): ActiveImpactor | undefined {
  const saveGame = groupObjects(save, 'SaveGame')[0]
  const events = saveGame ? behaviorOf(saveGame, 'GameplayEventManager')?.templateData : undefined
  const active = events?.activeEvents
  if (!Array.isArray(active)) return undefined
  const event = (active as TemplateData[]).find(
    (e) => (e.eventID as { hash?: number } | undefined)?.hash === LARGE_IMPACTOR_EVENT,
  )
  if (!event || asNumber(event.eventStartTime) === undefined) return undefined
  return { event, object: groupObjects(save, 'LargeImpactor')[0] }
}

/** The objects a Demolior edit rewrites, for undo snapshots. */
export function demoliorObjects(save: SaveGame): GameObject[] {
  const saveGame = groupObjects(save, 'SaveGame')[0]
  const impactor = groupObjects(save, 'LargeImpactor')[0]
  return [...(saveGame ? [saveGame] : []), ...(impactor ? [impactor] : [])]
}

// The impactor's state machines are saved as one opaque blob (`StateMachineController`). Each
// machine is `[nameLen][name][-1][stateLen][state][dataLen]`, then its own `[Serialize]` fields,
// then `[paramCount]` and the parameters. Only two machines are read, anchored by their type name,
// and every length is range-checked, so an unfamiliar blob reads as "unknown" instead of wrong.

const decoder = new TextDecoder('latin1')

function indexOfAscii(bytes: Uint8Array, text: string): number {
  const needle = Array.from(text, (c) => c.charCodeAt(0))
  outer: for (let i = 0; i + needle.length <= bytes.length; i++) {
    for (let j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer
    return i
  }
  return -1
}

interface MachineCursor {
  view: DataView
  /** Offset of the first byte after `[dataLen]`, i.e. the machine's own serialized fields. */
  fields: number
}

/** Finds `[nameLen][name][-1][stateLen][state][dataLen]` for a state machine instance type. */
function findMachine(bytes: Uint8Array, typeName: string): MachineCursor | null {
  const at = indexOfAscii(bytes, typeName)
  if (at < 4) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getInt32(at - 4, true) !== typeName.length) return null
  let cursor = at + typeName.length
  if (cursor + 12 > bytes.length || view.getInt32(cursor, true) !== -1) return null
  const stateLength = view.getInt32(cursor + 4, true)
  if (stateLength < 0 || stateLength > 256) return null
  cursor += 8 + stateLength
  if (cursor + 4 > bytes.length) return null
  return { view, fields: cursor + 4 }
}

interface TravelFields {
  /** Absolute byte offset of the three fields. */
  at: number
  destinationWorldId: number
  /** `ClusterMapLargeImpactor.Instance.ArrivalTime`, in seconds. */
  arrivalTime: number
  /** `ClusterMapLargeImpactor.Instance.Speed`, in hexes per 600 s. */
  speed: number
}

/** `[Serialize] int DestinationWorldID; float ArrivalTime; float Speed` of `ClusterMapLargeImpactor.Instance`. */
function readTravel(bytes: Uint8Array): TravelFields | null {
  const machine = findMachine(bytes, 'ClusterMapLargeImpactor+Instance')
  if (!machine || machine.fields + 12 > bytes.length) return null
  const at = machine.fields
  const destinationWorldId = machine.view.getInt32(at, true)
  const arrivalTime = machine.view.getFloat32(at + 4, true)
  const speed = machine.view.getFloat32(at + 8, true)
  if (destinationWorldId < 0 || destinationWorldId > 10_000) return null
  if (!Number.isFinite(arrivalTime) || arrivalTime <= 0) return null
  if (!Number.isFinite(speed) || speed <= 0) return null
  return { at, destinationWorldId, arrivalTime, speed }
}

/** `LargeImpactorStatus.sm.Health`, an `IntParameter` (max `HEALTH = 1000` in LargeImpactorConfig). */
const IMPACTOR_MAX_HEALTH = 1000

function readHealth(bytes: Uint8Array): number | null {
  const machine = findMachine(bytes, 'LargeImpactorStatus+Instance')
  if (!machine) return null
  const { view } = machine
  // `LargeImpactorStatus.Instance` has no fields of its own, so the parameter count follows.
  let cursor = machine.fields
  if (cursor + 4 > bytes.length) return null
  const count = view.getInt32(cursor, true)
  cursor += 4
  if (count < 1 || count > 16) return null
  for (let i = 0; i < count; i++) {
    if (cursor + 8 > bytes.length) return null
    const size = view.getInt32(cursor, true)
    const typeLength = view.getInt32(cursor + 4, true)
    if (size < 8 || typeLength < 0 || cursor + 4 + size > bytes.length) return null
    const nameLength = view.getInt32(cursor + 8 + typeLength, true)
    const nameAt = cursor + 12 + typeLength
    if (nameLength < 0 || nameAt + nameLength > cursor + 4 + size) return null
    const name = decoder.decode(bytes.subarray(nameAt, nameAt + nameLength))
    const valueAt = nameAt + nameLength
    if (name === 'Health' && cursor + 4 + size - valueAt === 4) {
      const health = view.getInt32(valueAt, true)
      return health >= 0 && health <= IMPACTOR_MAX_HEALTH ? health : null
    }
    cursor += 4 + size
  }
  return null
}

/** The saved flight fields, for tests and diagnostics. Null unless the blob reads cleanly. */
export function demoliorTravel(save: SaveGame): { arrivalTime: number; speed: number } | null {
  const bytes = stateMachineBytes(activeImpactor(save)?.object)
  const travel = bytes ? readTravel(bytes) : null
  return travel ? { arrivalTime: travel.arrivalTime, speed: travel.speed } : null
}

function stateMachineBytes(impactor: GameObject | undefined): Uint8Array | null {
  return impactor ? (behaviorOf(impactor, 'StateMachineController')?.extraRaw ?? null) : null
}

function difficultyOf(save: SaveGame): { id: string; name: string } | null {
  const settings = save.gameData.customGameSettings as
    | { CurrentQualityLevelsBySetting?: [string, string][] }
    | undefined
  const level = settings?.CurrentQualityLevelsBySetting?.find(
    ([id]) => id === 'DemoliorDifficulty',
  )?.[1]
  if (level === undefined) return null
  const name = findGameSetting('DemoliorDifficulty')?.levels.find((l) => l.id === level)?.name
  return { id: level, name: name ?? humanize(level) }
}

export function readDemolior(save: SaveGame): DemoliorView | null {
  if (!dlcIdsOf(save).includes('DLC4_ID')) return null
  const found = activeImpactor(save)
  const now = currentCycle(save)
  if (!found || now === undefined) return null

  const start = found.event.eventStartTime as number
  const difficulty = difficultyOf(save)
  const bytes = stateMachineBytes(found.object)
  const travel = found.object && bytes ? readTravel(bytes) : null
  const travels = found.object ? behaviorOf(found.object, 'ClusterTraveler') !== undefined : false

  // The formula can't see the `DemoliorImminentImpact` cluster tag (10 cycles), but the arrival
  // time the game stored already includes it, so prefer that when it disagrees.
  const formulaCycles = IMPACT_CYCLES[difficulty?.id ?? ''] ?? DEFAULT_IMPACT_CYCLES
  const savedCycles = travel ? travel.arrivalTime / SECONDS_PER_CYCLE - start : undefined
  const useSaved = savedCycles !== undefined && Math.abs(savedCycles - formulaCycles) > 0.5
  const durationCycles = useSaved ? savedCycles : formulaCycles
  const impactCycle = start + durationCycles

  const health = bytes ? readHealth(bytes) : null
  // Spaced Out impactors are driven by the ClusterTraveler, so the edit needs the travel fields.
  const editable = !travels || travel !== null
  return {
    eventStartCycle: start,
    difficulty,
    durationCycles,
    durationSource: useSaved ? 'saved' : 'difficulty',
    impactCycle,
    currentCycle: now,
    remainingCycles: Math.max(0, impactCycle - now),
    health: health === null ? null : { current: health, max: IMPACTOR_MAX_HEALTH },
    travels,
    editable,
    minImpactCycle: now + MIN_CYCLES_BEFORE_IMPACT,
  }
}

/** The cycle the edit will really store: not sooner than `MIN_CYCLES_BEFORE_IMPACT` from now. */
export function clampImpact(save: SaveGame, impactCycle: number): number {
  const now = currentCycle(save)
  return now === undefined ? impactCycle : Math.max(impactCycle, now + MIN_CYCLES_BEFORE_IMPACT)
}

/**
 * Moves the impact to `impactCycle` (game cycles, as `GetCurrentTimeInCycles`), clamped to at
 * least one cycle from now.
 *
 * Vanilla reads the impact time from `eventStartTime` alone (`LargeImpactorStatus.ArrivalTime_Vanilla`).
 * A Spaced Out impactor ignores it after creation and flies by its saved `ArrivalTime` and `Speed`
 * (`ClusterMapLargeImpactor.Instance`, ETA in `ClusterTraveler.TravelETA`), so those move too. The
 * hexes left stay the same, hence `Speed` scales by the old over the new time left.
 */
export function setDemoliorImpact(save: SaveGame, impactCycle: number): void {
  const view = readDemolior(save)
  const found = activeImpactor(save)
  if (!view || !found) throw new Error('This save has no active Demolior impact')
  if (!view.editable) throw new Error('The Demolior state in this save could not be read safely')
  if (!Number.isFinite(impactCycle)) throw new Error('The impact cycle must be a number')

  const target = clampImpact(save, impactCycle)
  const delta = target - view.impactCycle
  if (delta === 0) return

  if (view.travels) {
    const behavior = behaviorOf(found.object!, 'StateMachineController')!
    const bytes = behavior.extraRaw
    const travel = readTravel(bytes)!
    const oldLeft = travel.arrivalTime - view.currentCycle * SECONDS_PER_CYCLE
    const newLeft = oldLeft + delta * SECONDS_PER_CYCLE
    if (!(oldLeft > 0) || !(newLeft > 0)) {
      throw new Error('The impactor has already arrived or its timing is inconsistent')
    }
    // New array, so undo can put the old one back by reference.
    const copy = bytes.slice()
    const dv = new DataView(copy.buffer, copy.byteOffset, copy.byteLength)
    dv.setFloat32(travel.at + 4, travel.arrivalTime + delta * SECONDS_PER_CYCLE, true)
    dv.setFloat32(travel.at + 8, (travel.speed * oldLeft) / newLeft, true)
    behavior.extraRaw = copy
  }
  found.event.eventStartTime = view.eventStartCycle + delta
}

// --- World mixing -----------------------------------------------------------

export interface MixingEntry {
  id: string
  name: string
  kind: 'dlc' | 'world' | 'subworld'
  level: string
  levelName: string
}

export interface MixingView {
  entries: MixingEntry[]
}

/**
 * `CustomMixingSettingsConfigs`: the first group is `DlcMixingSettingConfig` (ids are DLC ids),
 * then `WorldMixingSettingConfig`, then `SubworldMixingSettingConfig`. Display names live in the
 * game's string tables, which the decompile does not carry; they are derived from the ids.
 */
const DLC_NAMES: Record<string, string> = {
  DLC2_ID: 'Frosty Planet Pack',
  DLC3_ID: 'Bionic Booster Pack',
  DLC4_ID: 'Prehistoric Planet Pack',
  DLC5_ID: 'Aquatic Planet Pack',
}
const WORLD_MIXING = new Set([
  'CeresAsteroidMixing',
  'PrehistoricAsteroidMixing',
  'AquaticAsteroidMixing',
])
const LEVEL_NAMES: Record<string, string> = {
  Disabled: 'Disabled',
  Enabled: 'Enabled',
  TryMixing: 'Try mixing',
  // sic: the game's own level id.
  GuranteeMixing: 'Guaranteed',
}

export function readMixing(save: SaveGame): MixingView | null {
  const settings = save.gameData.customGameSettings as
    | { CurrentMixingLevelsBySetting?: [string, string][] }
    | undefined
  const levels = settings?.CurrentMixingLevelsBySetting
  // Saves from before world mixing existed do not have the key.
  if (!Array.isArray(levels)) return null
  return {
    entries: levels.map(([id, level]) => {
      const kind =
        id in DLC_NAMES || id.endsWith('_ID') ? 'dlc' : WORLD_MIXING.has(id) ? 'world' : 'subworld'
      const name =
        kind === 'dlc' ? (DLC_NAMES[id] ?? humanize(id)) : humanize(id.replace(/Mixing$/, ''))
      return { id, name, kind, level, levelName: LEVEL_NAMES[level] ?? humanize(level) }
    }),
  }
}

// --- Geothermal -------------------------------------------------------------

export interface GeothermalVentView {
  id: string
  /** `GeothermalVent.QuestProgress`. */
  progress: string
  recentMass: number
  /** Total mass in `availableMaterial`. */
  availableMass: number
  availableItems: number
}

export interface GeothermalView {
  /** `GeothermalController.ProgressState` as a readable name. */
  state: string
  stateIndex: number
  vents: GeothermalVentView[]
}

/** `GeothermalController.ProgressState`. */
const CONTROLLER_STATES = [
  'Not started',
  'Fetching steel',
  'Reconnecting pipes',
  'Repair notice sent',
  'Repaired',
  'At capacity',
  'Complete',
]
/** `GeothermalVent.QuestProgress`. */
const VENT_PROGRESS = ['Uninitialized', 'Entombed', 'Complete']

export function readGeothermal(save: SaveGame): GeothermalView | null {
  if (!dlcIdsOf(save).includes('DLC2_ID')) return null
  const controller = groupObjects(save, 'GeothermalControllerEntity')[0]
  const state = controller
    ? asNumber(behaviorOf(controller, 'GeothermalController')?.templateData?.state)
    : undefined
  if (state === undefined) return null
  const vents = groupObjects(save, 'GeothermalVentEntity').flatMap((obj, index) => {
    const vent = behaviorOf(obj, 'GeothermalVent')?.templateData
    const progress = asNumber(vent?.progress)
    if (!vent || progress === undefined) return []
    const material = Array.isArray(vent.availableMaterial)
      ? (vent.availableMaterial as { mass?: unknown }[])
      : []
    return [
      {
        id: `GeothermalVentEntity:${index}`,
        progress: VENT_PROGRESS[progress] ?? `Unknown (${progress})`,
        recentMass: asNumber(vent.recentMass) ?? 0,
        availableMass: material.reduce((sum, item) => sum + (asNumber(item?.mass) ?? 0), 0),
        availableItems: material.length,
      },
    ]
  })
  return {
    state: CONTROLLER_STATES[state] ?? `Unknown (${state})`,
    stateIndex: state,
    vents,
  }
}

// --- Page ---------------------------------------------------------------------

export interface DlcPageView {
  dlcIds: string[]
  demolior: DemoliorView | null
  mixing: MixingView | null
  geothermal: GeothermalView | null
}

export function listDlc(save: SaveGame): DlcPageView {
  return {
    dlcIds: dlcIdsOf(save),
    demolior: readDemolior(save),
    mixing: readMixing(save),
    geothermal: readGeothermal(save),
  }
}
