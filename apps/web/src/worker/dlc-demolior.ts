import { findGameSetting, hashString, humanize } from '@oni-duplicity/game-data'
import type { GameObject, SaveGame, TemplateData } from '@oni-duplicity/save-parser'
import {
  IMPACTOR_MAX_HEALTH,
  readHealth,
  readTravel,
  type TravelFields,
} from './dlc-demolior-blob.ts'
import { asNumber, behaviorOf, dlcIdsOf, groupObjects, SECONDS_PER_CYCLE } from './dlc-shared.ts'

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
  /** True when the impact time comes from the saved flight data, not from the difficulty formula. */
  arrivalSaved: boolean
  /** False when the impact time can't be changed safely; `readOnlyReason` says why. */
  editable: boolean
  readOnlyReason: string | null
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

export interface ActiveImpactor {
  event: TemplateData
  object?: GameObject
}

export function activeImpactor(save: SaveGame): ActiveImpactor | undefined {
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

/** The saved flight fields, for tests and diagnostics. Null unless the blob reads cleanly. */
export function demoliorTravel(save: SaveGame): { arrivalTime: number; speed: number } | null {
  const bytes = stateMachineBytes(activeImpactor(save)?.object)
  const travel = bytes ? readTravel(bytes) : null
  return travel ? { arrivalTime: travel.arrivalTime, speed: travel.speed } : null
}

export function stateMachineBytes(impactor: GameObject | undefined): Uint8Array | null {
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

/**
 * The edit needs the impactor's saved flight data: that is what Spaced Out flies by, and it is
 * the only place that records the real impact time. Without it the time would be a guess,
 * because `GetImpactTime()` also depends on the `DemoliorImminentImpact` cluster tag, which sits
 * in the cluster layout's definition and is not stored in the save.
 */
function readOnlyReasonOf(input: {
  spacedOut: boolean
  travels: boolean
  travel: TravelFields | null
  secondsLeft: number
}): string | null {
  const { spacedOut, travels, travel, secondsLeft } = input
  if (travel === null) {
    return spacedOut
      ? 'This Spaced Out save has no readable flight data for the impactor, and the game flies it by that, so editing the event start would change nothing.'
      : 'This save does not store when the impactor arrives, and the cluster’s imminent-impact tag that can shorten it is not saved either, so the shown time is only the difficulty setting’s.'
  }
  if (!travels) return 'The impactor has no cluster traveler, so its flight data is not in use.'
  if (!(secondsLeft > 0)) return 'The impactor has already arrived.'
  return null
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
  const spacedOut = dlcIdsOf(save).includes('EXPANSION1_ID')

  // The formula can't see the `DemoliorImminentImpact` cluster tag (10 cycles), but the arrival
  // time the game stored already includes it, so prefer that when it disagrees.
  const formulaCycles = IMPACT_CYCLES[difficulty?.id ?? ''] ?? DEFAULT_IMPACT_CYCLES
  const savedCycles = travel ? travel.arrivalTime / SECONDS_PER_CYCLE - start : undefined
  const useSaved = savedCycles !== undefined && Math.abs(savedCycles - formulaCycles) > 0.5
  const durationCycles = useSaved ? savedCycles : formulaCycles
  const impactCycle = start + durationCycles

  const health = bytes ? readHealth(bytes) : null
  const readOnlyReason = readOnlyReasonOf({
    spacedOut,
    travels,
    travel,
    secondsLeft: travel ? travel.arrivalTime - now * SECONDS_PER_CYCLE : 0,
  })
  return {
    eventStartCycle: start,
    difficulty,
    durationCycles,
    durationSource: useSaved ? 'saved' : 'difficulty',
    impactCycle,
    currentCycle: now,
    remainingCycles: Math.max(0, impactCycle - now),
    health: health === null ? null : { current: health, max: IMPACTOR_MAX_HEALTH },
    arrivalSaved: travel !== null,
    editable: readOnlyReason === null,
    readOnlyReason,
    minImpactCycle: now + MIN_CYCLES_BEFORE_IMPACT,
  }
}

/** The cycle the edit will really store: not sooner than `MIN_CYCLES_BEFORE_IMPACT` from now. */
export function clampImpact(save: SaveGame, impactCycle: number): number {
  const now = currentCycle(save)
  return now === undefined ? impactCycle : Math.max(impactCycle, now + MIN_CYCLES_BEFORE_IMPACT)
}
