import { expect, test } from 'vite-plus/test'
import { groupChanges, summarizeChanges } from '../src/lib/changes.ts'
import { describeLoadError } from '../src/lib/load-error.ts'
import { editTarget } from '../src/worker/describe.ts'
import type { Edit } from '../src/worker/model.ts'

test('the summary counts distinct targets, not edits', () => {
  const edits: Edit[] = [
    { type: 'setDuplicantName', id: 'Minion:0', name: 'A' },
    { type: 'setGender', id: 'Minion:0', gender: 'MALE' },
    { type: 'addTrait', id: 'Minion:1', traitId: 'Anemic' },
    { type: 'setExperience', id: 'BionicMinion:4', experience: 1 },
    { type: 'setGeyserValue', id: 'GeyserGeneric_steam:2', field: 'scaledRate', value: 1 },
    { type: 'setColonyName', name: 'X' },
    { type: 'setSandbox', enabled: true },
  ]
  const summary = summarizeChanges(edits.map(editTarget))
  expect(summary).toBe('colony settings, 3 duplicants, 1 geyser')
})

test('a bulk action reads as every duplicant', () => {
  const targets = [
    editTarget({ type: 'setGender', id: 'Minion:0', gender: 'MALE' }),
    editTarget({ type: 'bulkDuplicants', action: 'masterSkills' }),
  ]
  expect(summarizeChanges(targets)).toBe('all duplicants')
  expect(groupChanges([])).toEqual([])
})

test('object ids are grouped by what the prefab is', () => {
  expect(editTarget({ type: 'deleteObject', id: 'Hatch:3' })).toEqual({
    category: 'critter',
    key: 'Hatch:3',
  })
  expect(editTarget({ type: 'cloneObject', id: 'Minion:3' }).category).toBe('duplicant')
  expect(editTarget({ type: 'deleteObject', id: 'Tile:3' }).category).toBe('object')
  expect(editTarget({ type: 'rawSet', path: ['a', 1], value: 2 })).toEqual({
    category: 'raw',
    key: 'a.1',
  })
})

test('load errors are sorted into friendly kinds', () => {
  const kind = (message: string) => describeLoadError(new Error(message)).kind
  expect(kind('Header is not valid JSON; this is probably not an ONI save file (at byte 12)')).toBe(
    'not-save',
  )
  expect(kind('Save version 6.1 is not supported (need 7.x) (at byte 0, in header)')).toBe(
    'version',
  )
  expect(kind('Unexpected end of data: needed 4 bytes, 1 left (at byte 99, in Minion)')).toBe(
    'truncated',
  )
  expect(kind('Could not decompress the save body: boom (at byte 200)')).toBe('truncated')
  expect(
    kind('Unexpected end of data: needed 1948265583 bytes, 488 left (at byte 16, in header)'),
  ).toBe('not-save')
  expect(kind('something else')).toBe('unknown')
  expect(describeLoadError(new Error('x (at byte 99, in y)')).offset).toBe(99)
})
