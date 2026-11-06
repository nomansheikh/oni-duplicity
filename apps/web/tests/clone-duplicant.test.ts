import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseSave, writeSave, writeSaveParts, type SaveGame } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { applyEdit } from '../src/worker/model.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import {
  allInstanceIds,
  body,
  dangling,
  find,
  group,
  idOf,
  masterTargets,
  references,
  storedCount,
} from './clone-helpers.ts'
import { sameBytes } from './helpers.ts'

const testData = fileURLToPath(new URL('../../../test-data/', import.meta.url))
const required = Boolean(process.env.CI) && process.env.FIXTURE_TIER === 'all'

// [file, duplicant index, whether it carries stored items]. Committed fixtures first; the rest
// are fetched on demand and skipped when missing, except in the full-tier CI run.
const CASES: [string, number, boolean][] = [
  ['apple-park.sav', 0, false],
  ['beautiful-galaxy.sav', 0, false],
  ['beautiful-galaxy.sav', 3, true],
  ['beautiful-galaxy-build-744825.sav', 8, false],
  ['konove-save-game.sav', 5, true],
  ['mithro-01-early-game-cycle-010.sav', 2, false],
  ['mithro-02-mid-game-cycle-148.sav', 7, true],
  ['mithro-03-late-game-cycle-1160.sav', 13, true],
  ['mithro-04-advanced-cycle-1434.sav', 0, false],
  ['mithro-05-most-dupes-59-cycle-1423.sav', 20, true],
]
const pathOf = (file: string) =>
  `${testData}${existsSync(`${testData}saves/${file}`) ? 'saves' : 'fetched'}/${file}`

const parts = (save: SaveGame) => {
  const { head, body } = writeSaveParts(save)
  return { head: head.slice(), body: body.slice() }
}

function check(path: string, at: number, carries: boolean) {
  const save = parseSave(readFileSync(path))
  const before = parts(save)
  const source = group(save, 'Minion')[at]!
  const sourceId = idOf(source)
  const sourceName = String(find(source, 'MinionIdentity')!.templateData!.name)
  const counter = Number(save.settings.nextUniqueID)
  const minionCount = group(save, 'Minion').length
  const proxyCount = group(save, 'MinionAssignablesProxy').length
  const held = storedCount(source)
  expect(held > 0, 'fixture changed: stored items expected').toBe(carries)
  const dangledBefore = new Set(dangling(save))
  // A fixture may already hold duplicate ids (mithro-04 has two); the clone must add none.
  const idsBefore = allInstanceIds(save)
  const knownBefore = new Set(idsBefore)
  const repeatsBefore = idsBefore.length - knownBefore.size

  const undo = applyWithRestore(save, { type: 'cloneDuplicant', id: `Minion:${at}` })

  const copy = group(save, 'Minion')[at + 1]!
  const copyId = idOf(copy)
  const copyIdentity = find(copy, 'MinionIdentity')!.templateData!
  expect(group(save, 'Minion')).toHaveLength(minionCount + 1)
  expect(group(save, 'MinionAssignablesProxy')).toHaveLength(proxyCount + 1)
  expect(copyIdentity.name).toBe(`${sourceName} (clone)`)
  expect(copy.position).toEqual(source.position)
  expect(idOf(group(save, 'Minion')[at]!)).toBe(sourceId)

  // Unique ids, taken from the counter, which ends two past where it began.
  const ids = allInstanceIds(save)
  expect(ids.length - new Set(ids).size).toBe(repeatsBefore)
  expect(knownBefore.has(copyId) || knownBefore.has(copyId + 1)).toBe(false)
  expect(copyId).toBe(counter)
  expect(Number(save.settings.nextUniqueID)).toBe(counter + 2)

  // The copy and its proxy point at each other, and only the copy's identity names the proxy.
  const proxyId = (copyIdentity.assignableProxy as { id: number }).id
  expect(proxyId).toBe(counter + 1)
  const proxy = group(save, 'MinionAssignablesProxy').find((p) => idOf(p) === proxyId)!
  expect(find(proxy, 'MinionAssignablesProxy')!.templateData!.target_instance_id).toBe(copyId)
  expect(references(save).filter((r) => r === proxyId)).toHaveLength(1)

  // Every reference in the save resolves, apart from any the fixture already had dangling.
  expect(dangling(save).filter((r) => !dangledBefore.has(r))).toEqual([])

  // State machines belong to their own duplicant.
  const targets = masterTargets(copy)
  expect(targets.length).toBeGreaterThan(0)
  expect(targets.every((t) => t === copyId)).toBe(true)
  expect(masterTargets(source).every((t) => t === sourceId)).toBe(true)
  expect(masterTargets(source)).toHaveLength(targets.length)

  // Held items stay with the original, and are not duplicated.
  expect(storedCount(copy)).toBe(0)
  expect(storedCount(source)).toBe(held)

  // The copy joins the original's schedule, once.
  const manager = group(save, 'SaveGame')[0]!
  const schedules = find(manager, 'ScheduleManager')!.templateData!.schedules as {
    assigned: { id: number }[]
  }[]
  const inCopy = schedules.filter((s) => s.assigned.some((a) => a.id === copyId))
  const inSource = schedules.filter((s) => s.assigned.some((a) => a.id === sourceId))
  expect(inCopy.length).toBe(inSource.length)
  for (const s of inCopy) expect(s.assigned.filter((a) => a.id === copyId)).toHaveLength(1)

  // Writing, re-reading and writing again gives the same header, templates and body.
  const written = parts(save)
  const reread = parseSave(writeSave(save))
  const again = parts(reread)
  expect(sameBytes(again.head, written.head)).toBe(true)
  expect(sameBytes(again.body, written.body)).toBe(true)
  expect(reread.header.gameInfo).toEqual(save.header.gameInfo)
  expect(reread.warnings).toEqual(save.warnings)
  expect(masterTargets(group(reread, 'Minion')[at + 1]!).every((t) => t === copyId)).toBe(true)

  // Undo puts everything back, header included.
  undo()
  const restored = parts(save)
  expect(sameBytes(restored.head, before.head)).toBe(true)
  expect(sameBytes(restored.body, before.body)).toBe(true)
}

for (const [file, at, carries] of CASES) {
  const path = pathOf(file)
  test.skipIf(!existsSync(path) && !required)(
    `cloning duplicant ${at} in ${file} stays valid`,
    () => {
      expect(existsSync(path), 'full-tier fixture missing').toBe(true)
      check(path, at, carries)
    },
    300_000,
  )
}

test('a failed clone leaves the save and its id counter alone', () => {
  const save = parseSave(readFileSync(pathOf('beautiful-galaxy.sav')))
  const dupe = group(save, 'Minion')[0]!
  dupe.behaviors = dupe.behaviors.filter((b) => b.name !== 'StateMachineController')
  const before = body(save)
  const counter = save.settings.nextUniqueID
  expect(() => applyEdit(save, { type: 'cloneDuplicant', id: 'Minion:0' })).toThrow()
  expect(save.settings.nextUniqueID).toBe(counter)
  expect(sameBytes(body(save), before)).toBe(true)
})

test('a bionic duplicant is refused and nothing changes', () => {
  const path = pathOf('mithro-06-maximum-cycle-4770.sav')
  if (!existsSync(path)) {
    expect(required, 'full-tier fixture missing').toBe(false)
    return
  }
  const save = parseSave(readFileSync(path))
  const before = body(save)
  expect(() => applyEdit(save, { type: 'cloneDuplicant', id: 'BionicMinion:0' })).toThrow(/Bionic/)
  expect(sameBytes(body(save), before)).toBe(true)
}, 300_000)
