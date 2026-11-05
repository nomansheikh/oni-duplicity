import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  parseSave,
  writeSave,
  writeSaveParts,
  type GameObject,
  type SaveGame,
} from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { applyEdit } from '../src/worker/model.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { sameBytes } from './helpers.ts'

const testData = fileURLToPath(new URL('../../../test-data/', import.meta.url))
const COMMITTED = ['apple-park.sav', 'beautiful-galaxy.sav', 'beautiful-galaxy-build-744825.sav']
// Fetched on demand; missing files are skipped except in the full-tier CI run.
const FETCHED = [
  'konove-save-game.sav',
  'mithro-01-early-game-cycle-010.sav',
  'mithro-02-mid-game-cycle-148.sav',
  'mithro-03-late-game-cycle-1160.sav',
  'mithro-05-most-dupes-59-cycle-1423.sav',
]
const required = Boolean(process.env.CI) && process.env.FIXTURE_TIER === 'all'

const find = (obj: GameObject, name: string) => obj.behaviors.find((b) => b.name === name)
const group = (save: SaveGame, name: string) =>
  save.gameObjects.find((g) => g.name === name)?.gameObjects ?? []
const idOf = (obj: GameObject) => Number(find(obj, 'KPrefabID')!.templateData!.InstanceID)
const body = (save: SaveGame) => writeSaveParts(save).body.slice()

/** Every KPrefabID instance ID in the save, including stored items. */
function allInstanceIds(save: SaveGame): number[] {
  const ids: number[] = []
  const visit = (obj: GameObject) => {
    const kp = find(obj, 'KPrefabID')?.templateData?.InstanceID
    if (typeof kp === 'number') ids.push(kp)
    for (const b of obj.behaviors) {
      if (b.name === 'Storage' && Array.isArray(b.extraData))
        (b.extraData as GameObject[]).forEach(visit)
    }
  }
  for (const g of save.gameObjects) g.gameObjects.forEach(visit)
  return ids
}

/** The `masterTarget` instance IDs a duplicant's state machine blob holds. */
function masterTargets(obj: GameObject): number[] {
  const raw = find(obj, 'StateMachineController')!.extraRaw
  const buf = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength)
  const out: number[] = []
  let at = -1
  while ((at = buf.indexOf('masterTarget', at + 1)) >= 0) out.push(buf.readInt32LE(at + 12))
  return out
}

function check(file: string, path: string) {
  const save = parseSave(readFileSync(path))
  const before = body(save)
  const minionCount = group(save, 'Minion').length
  const source = group(save, 'Minion')[0]!
  const sourceId = idOf(source)
  const sourceName = String(find(source, 'MinionIdentity')!.templateData!.name)
  const counter = Number(save.settings.nextUniqueID)
  const dupeCount = save.header.gameInfo.numberOfDuplicants
  const proxyCount = group(save, 'MinionAssignablesProxy').length

  const undo = applyWithRestore(save, { type: 'cloneDuplicant', id: 'Minion:0' })

  const copy = group(save, 'Minion')[1]!
  const copyId = idOf(copy)
  const copyIdentity = find(copy, 'MinionIdentity')!.templateData!
  expect(group(save, 'Minion')).toHaveLength(minionCount + 1)
  expect(group(save, 'MinionAssignablesProxy')).toHaveLength(proxyCount + 1)
  expect(save.header.gameInfo.numberOfDuplicants).toBe(dupeCount + 1)
  expect(copyIdentity.name).toBe(`${sourceName} (clone)`)
  expect(copy.position).toEqual(source.position)

  // Unique instance IDs, drawn from the save's counter.
  const ids = allInstanceIds(save)
  expect(new Set(ids).size, `${file} has duplicate instance IDs`).toBe(ids.length)
  expect(copyId).toBe(counter)
  expect(Number(save.settings.nextUniqueID)).toBe(counter + 2)

  // The proxy and the duplicant point at each other, and nothing else points at the new proxy.
  const proxyId = (copyIdentity.assignableProxy as { id: number }).id
  const proxy = group(save, 'MinionAssignablesProxy').find((p) => idOf(p) === proxyId)!
  expect(proxy).toBeDefined()
  expect(find(proxy, 'MinionAssignablesProxy')!.templateData!.target_instance_id).toBe(copyId)
  expect(proxyId).not.toBe(
    (find(source, 'MinionIdentity')!.templateData!.assignableProxy as { id: number }).id,
  )
  const json = (o: unknown) => JSON.stringify(o)
  const ownables = save.gameObjects
    .flatMap((g) => g.gameObjects)
    .filter((o) => find(o, 'Ownable'))
    .map((o) => json(find(o, 'Ownable')!.templateData))
  expect(ownables.some((o) => o.includes(`"id":${proxyId}`))).toBe(false)

  // Every state machine of the copy is the copy's own; the original's are untouched.
  const targets = masterTargets(copy)
  expect(targets.length).toBeGreaterThan(0)
  expect(targets.every((t) => t === copyId)).toBe(true)
  expect(masterTargets(source).every((t) => t === sourceId)).toBe(true)
  expect(masterTargets(source)).toHaveLength(targets.length)
  expect(find(copy, 'StateMachineController')!.extraRaw).toHaveLength(
    find(source, 'StateMachineController')!.extraRaw.length,
  )

  // Held items stay with the original.
  for (const b of copy.behaviors) if (b.name === 'Storage') expect(b.extraData).toEqual([])

  // Schedules: the copy joins every schedule of the original, once.
  const manager = group(save, 'SaveGame')[0]!
  const schedules = find(manager, 'ScheduleManager')!.templateData!.schedules as {
    assigned: { id: number }[]
  }[]
  const memberOf = schedules.filter((s) => s.assigned.some((a) => a.id === sourceId))
  expect(memberOf.length).toBeLessThanOrEqual(1)
  for (const s of memberOf) expect(s.assigned.filter((a) => a.id === copyId)).toHaveLength(1)
  expect(schedules.filter((s) => s.assigned.some((a) => a.id === copyId))).toHaveLength(
    memberOf.length,
  )

  // The result round-trips: written, re-read and written again gives the same bytes.
  const bytes = writeSave(save)
  const reread = parseSave(bytes)
  expect(reread.warnings).toEqual(save.warnings)
  expect(sameBytes(body(reread), body(save))).toBe(true)
  expect(group(reread, 'Minion')).toHaveLength(group(save, 'Minion').length)
  expect(masterTargets(group(reread, 'Minion')[1]!).every((t) => t === copyId)).toBe(true)
  const reIds = allInstanceIds(reread)
  expect(new Set(reIds).size).toBe(reIds.length)

  // Undo puts everything back, byte for byte.
  undo()
  expect(sameBytes(body(save), before)).toBe(true)
}

for (const file of COMMITTED) {
  test(`cloning a duplicant in ${file} stays valid`, () => {
    check(file, `${testData}saves/${file}`)
  }, 120_000)
}

for (const file of FETCHED) {
  const path = `${testData}fetched/${file}`
  test.skipIf(!existsSync(path) && !required)(
    `cloning a duplicant in ${file} stays valid`,
    () => {
      expect(existsSync(path), 'full-tier fixture missing').toBe(true)
      check(file, path)
    },
    300_000,
  )
}

test('a bionic duplicant is refused and nothing changes', () => {
  const path = `${testData}fetched/mithro-06-maximum-cycle-4770.sav`
  if (!existsSync(path)) {
    expect(required, 'full-tier fixture missing').toBe(false)
    return
  }
  const save = parseSave(readFileSync(path))
  const before = body(save)
  expect(() => applyEdit(save, { type: 'cloneDuplicant', id: 'BionicMinion:0' })).toThrow(/Bionic/)
  expect(sameBytes(body(save), before)).toBe(true)
}, 300_000)
