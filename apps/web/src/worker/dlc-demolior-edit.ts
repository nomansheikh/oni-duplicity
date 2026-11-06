import type { SaveGame } from '@oni-duplicity/save-parser'
import { readTravel } from './dlc-demolior-blob.ts'
import { activeImpactor, clampImpact, readDemolior } from './dlc-demolior.ts'
import { behaviorOf, SECONDS_PER_CYCLE } from './dlc-shared.ts'

/**
 * Moves the impact to `impactCycle` (game cycles, as `GetCurrentTimeInCycles`), clamped to at
 * least one cycle from now.
 *
 * A Spaced Out impactor ignores `eventStartTime` after creation and flies by its saved `ArrivalTime`
 * and `Speed` (`ClusterMapLargeImpactor.Instance`, ETA in `ClusterTraveler.TravelETA`), so those
 * move with it. The hexes left stay the same, hence `Speed` scales by the old over the new time
 * left. Saves without that flight data are refused (see `readOnlyReasonOf`).
 */
export function setDemoliorImpact(save: SaveGame, impactCycle: number): void {
  const view = readDemolior(save)
  const found = activeImpactor(save)
  if (!view || !found) throw new Error('This save has no active Demolior impact')
  if (!view.editable) throw new Error(view.readOnlyReason ?? 'This impact can’t be edited')
  if (!Number.isFinite(impactCycle)) throw new Error('The impact cycle must be a number')

  const target = clampImpact(save, impactCycle)
  const delta = target - view.impactCycle
  if (delta === 0) return

  {
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
