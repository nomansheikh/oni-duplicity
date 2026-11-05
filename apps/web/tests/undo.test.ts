import { readFileSync } from 'node:fs'
import {
  parseSave,
  writeSaveParts,
  type GameObject,
  type SaveGame,
} from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { applyEdit, listDuplicants, type Edit } from '../src/worker/model.ts'
import { applyWithRestore, snapshot } from '../src/worker/snapshot.ts'
import { changedPaths, galaxy, roundTrip, sameBytes } from './helpers.ts'

const load = () => parseSave(readFileSync(galaxy))
const body = (save: SaveGame) => writeSaveParts(save).body.slice()

function minions(save: SaveGame): GameObject[] {
  return save.gameObjects.flatMap((g) =>
    g.gameObjects.filter((o) => o.behaviors.some((b) => b.name === 'MinionIdentity')),
  )
}

/** Whether the object at a changed path is a duplicant. */
function isMinionPath(save: SaveGame, path: string): boolean {
  const [, group, , index] = path.split('.')
  const obj = save.gameObjects[Number(group)]?.gameObjects[Number(index)]
  return obj?.behaviors.some((b) => b.name === 'MinionIdentity') ?? false
}

test('a bulk edit that throws midway leaves the save byte-identical', () => {
  const broken = load()
  const victims = minions(broken)
  expect(victims.length).toBeGreaterThan(3)
  // Skill mastery needs MinionResume; without it the edit fails after the earlier duplicants changed.
  const third = victims[2]!
  third.behaviors = third.behaviors.filter((b) => b.name !== 'MinionResume')
  const before = body(broken)
  const edit: Edit = { type: 'bulkDuplicants', action: 'masterSkills' }

  // Sanity: without the rollback the earlier duplicants really are left changed.
  const unprotected = load()
  const hurt = minions(unprotected)[2]!
  hurt.behaviors = hurt.behaviors.filter((b) => b.name !== 'MinionResume')
  expect(() => applyEdit(unprotected, edit)).toThrow()
  expect(sameBytes(body(unprotected), before)).toBe(false)

  expect(() => applyWithRestore(broken, edit)).toThrow()
  expect(sameBytes(body(broken), before)).toBe(true)
}, 120_000)

test('undoing a bulk edit restores every duplicant byte for byte', () => {
  const save = load()
  const before = body(save)
  const undo = applyWithRestore(save, { type: 'bulkDuplicants', action: 'masterSkills' })
  expect(sameBytes(body(save), before)).toBe(false)
  undo()
  expect(sameBytes(body(save), before)).toBe(true)
}, 120_000)

test('the debug flag edit changes only that flag, and undo restores it', () => {
  const save = load()
  const original = save.gameData.debugWasUsed as boolean
  expect(typeof original).toBe('boolean')
  const before = body(save)
  const base = roundTrip(save)

  const undo = applyWithRestore(save, { type: 'setDebugWasUsed', used: !original })
  expect(changedPaths(base, roundTrip(save))).toEqual(['gameData.debugWasUsed'])
  undo()
  expect(save.gameData.debugWasUsed).toBe(original)
  expect(sameBytes(body(save), before)).toBe(true)
}, 120_000)

test('undo removes a debug flag that the save did not have instead of adding undefined', () => {
  const save = load()
  delete save.gameData.debugWasUsed
  const undo = snapshot(save, { type: 'setDebugWasUsed', used: true })
  save.gameData.debugWasUsed = true
  undo()
  expect('debugWasUsed' in save.gameData).toBe(false)
})

test('setDebugWasUsed refuses saves without the flag', () => {
  const save = load()
  delete save.gameData.debugWasUsed
  expect(() => applyEdit(save, { type: 'setDebugWasUsed', used: true })).toThrow(/no debug flag/)
})

// Each action may only touch its own fields on duplicants, which a write and parse proves.
const bulk: { edit: Edit; field: RegExp; check: (save: SaveGame) => void }[] = [
  {
    edit: { type: 'bulkDuplicants', action: 'relieveStress' },
    field: /\.behaviors\.\d+\.extraData\.amounts\.\d+\.value\.value$/,
    check: (save) => {
      for (const d of listDuplicants(save)) {
        const stress = d.amounts.find((a) => a.id === 'Stress')
        if (stress) expect(stress.value).toBe(0)
      }
    },
  },
  {
    edit: { type: 'bulkDuplicants', action: 'fillNeeds' },
    field: /\.behaviors\.\d+\.extraData\.amounts\.\d+\.value\.value$/,
    check: (save) => {
      for (const d of listDuplicants(save)) {
        for (const [id, value] of [
          ['HitPoints', 100],
          ['Stamina', 100],
          ['Breath', 100],
          ['Bladder', 0],
          ['Stress', 0],
        ] as const) {
          const amount = d.amounts.find((a) => a.id === id)
          if (amount) expect(amount.value, `${d.name} ${id}`).toBe(value)
        }
      }
    },
  },
  {
    edit: { type: 'bulkDuplicants', action: 'setAttributes', level: 7 },
    field: /\.behaviors\.\d+\.templateData\.saveLoadLevels\.\d+\.level$/,
    check: (save) => {
      for (const d of listDuplicants(save)) {
        for (const a of d.attributes) expect(a.level, `${d.name} ${a.id}`).toBe(7)
      }
    },
  },
  {
    edit: { type: 'bulkDuplicants', action: 'masterSkills' },
    field: /\.behaviors\.\d+\.templateData\.MasteryBySkillID(\.\d+){0,2}$/,
    check: (save) => {
      for (const d of listDuplicants(save)) {
        expect(
          d.skills.some((s) => s.mastered),
          d.name,
        ).toBe(true)
      }
    },
  },
]

for (const { edit, field, check } of bulk) {
  test(`bulk ${edit.type === 'bulkDuplicants' ? edit.action : ''} changes only duplicant fields`, () => {
    const save = load()
    const base = roundTrip(save)
    applyEdit(save, edit)
    const reparsed = roundTrip(save)
    const paths = changedPaths(base, reparsed)
    expect(paths.length).toBeGreaterThan(0)
    for (const path of paths) {
      expect(isMinionPath(base, path), path).toBe(true)
      expect(path, path).toMatch(field)
    }
    check(reparsed)
  }, 120_000)
}
