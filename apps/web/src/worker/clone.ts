import type { SaveGame } from '@oni-duplicity/save-parser'
import { behavior, cloneValue, data, locate, saveGameObject, splitId } from './model.ts'

/** Field name that precedes every state machine's reference to its own duplicant (see below). */
const SM_MASTER_LABEL = new TextEncoder().encode('masterTarget')

/**
 * Points every state machine in a duplicant's `StateMachineController` blob at a new instance
 * ID. Each state machine instance saves its `masterTarget` as the label `masterTarget` followed
 * by the owner's KPrefabID instance ID as an int32. The blob is opaque to us, so only that
 * labelled int32 is rewritten; it keeps its length. Returns how many it rewrote.
 */
function retargetStateMachines(raw: Uint8Array, from: number, to: number): number {
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  let count = 0
  const last = raw.length - SM_MASTER_LABEL.length - 4
  outer: for (let i = 0; i <= last; i++) {
    for (let j = 0; j < SM_MASTER_LABEL.length; j++)
      if (raw[i + j] !== SM_MASTER_LABEL[j]) continue outer
    const at = i + SM_MASTER_LABEL.length
    if (view.getInt32(at, true) !== from) continue
    view.setInt32(at, to, true)
    count++
  }
  return count
}

/**
 * Adds a copy of a standard duplicant next to the original. Beyond copying the object it:
 * gives the copy and its `MinionAssignablesProxy` fresh instance IDs, points the proxy and the
 * copy's `assignableProxy` at each other, rewrites the state machines' self reference, adds the
 * copy to the schedules the original is in, empties the copy's storage (held items) and names it
 * "<name> (clone)". It does not copy bed or other assignments (they refer to the original's
 * proxy), and does not touch report history. Bionics are refused: their boosters and battery
 * banks refer back to the duplicant. See docs/open-questions.md.
 */
export function cloneDuplicant(save: SaveGame, id: string): void {
  const { list, index } = locate(save, id)
  const { group } = splitId(id)
  if (group !== 'Minion') {
    throw new Error(
      group === 'BionicMinion'
        ? 'Bionic duplicants cannot be cloned: their boosters and battery banks refer back to them'
        : `${id} is not a standard duplicant`,
    )
  }
  const source = list[index]!
  const identity = data(source, 'MinionIdentity')
  const sourceId = Number(data(source, 'KPrefabID').InstanceID)
  const proxyRef = identity.assignableProxy as { id: number } | null | undefined
  const proxyGroup = save.gameObjects.find((g) => g.name === 'MinionAssignablesProxy')
  const proxyIndex =
    proxyGroup?.gameObjects.findIndex(
      (p) =>
        behavior(p, 'KPrefabID')?.templateData?.InstanceID === proxyRef?.id &&
        behavior(p, 'MinionAssignablesProxy')?.templateData?.target_instance_id === sourceId,
    ) ?? -1
  if (!proxyGroup || proxyIndex < 0) {
    throw new Error('This duplicant has no assignables proxy, so it cannot be cloned safely')
  }
  const machines = behavior(source, 'StateMachineController')
  if (!machines) throw new Error('This duplicant has no state machine data, so it cannot be cloned')

  // Nothing in the save changes until every check has passed, so a throw never leaks ids.
  const next = Number(save.settings.nextUniqueID)
  if (!Number.isFinite(next)) throw new Error('This save has no unique ID counter')
  const copy = cloneValue(source)
  const proxy = cloneValue(proxyGroup.gameObjects[proxyIndex]!)
  const copyId = next
  const proxyId = next + 1
  data(copy, 'KPrefabID').InstanceID = copyId
  data(proxy, 'KPrefabID').InstanceID = proxyId
  data(proxy, 'MinionAssignablesProxy').target_instance_id = copyId
  const copyIdentity = data(copy, 'MinionIdentity')
  copyIdentity.assignableProxy = { id: proxyId }
  copyIdentity.name = `${String(identity.name)} (clone)`

  const rewritten = retargetStateMachines(
    behavior(copy, 'StateMachineController')!.extraRaw,
    sourceId,
    copyId,
  )
  if (rewritten === 0) throw new Error('Could not find the duplicant in its state machine data')
  // Whatever the duplicant was carrying stays with the original.
  for (const b of copy.behaviors)
    if (b.name === 'Storage' && Array.isArray(b.extraData)) b.extraData = []

  const manager = saveGameObject(save)
  const schedules = (manager && behavior(manager, 'ScheduleManager')?.templateData?.schedules) as
    | { assigned: { id: number }[] }[]
    | undefined
  for (const schedule of schedules ?? []) {
    if (schedule.assigned.some((a) => a.id === sourceId)) schedule.assigned.push({ id: copyId })
  }

  save.settings.nextUniqueID = next + 2
  list.splice(index + 1, 0, copy)
  proxyGroup.gameObjects.splice(proxyIndex + 1, 0, proxy)
  save.header.gameInfo.numberOfDuplicants += 1
}
