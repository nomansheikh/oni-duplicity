import { expect, test } from 'vite-plus/test'
import { draftAfterModelChange, textToCommit } from '../src/lib/draft.ts'

test('a focused field keeps its draft when the model value changes', () => {
  // Rename to "First", then type "Second" before the worker answers the first rename.
  expect(draftAfterModelChange('Second', true)).toBe('Second')
})

test('an unfocused field follows the model again', () => {
  expect(draftAfterModelChange('Second', false)).toBeNull()
  expect(draftAfterModelChange(null, false)).toBeNull()
})

test('a draft that survived a model change is still committed on blur', () => {
  const draft = draftAfterModelChange('Second', true)
  expect(textToCommit(draft, 'First')).toBe('Second')
})

test('nothing is committed when the text matches the model or was never edited', () => {
  expect(textToCommit(null, 'First')).toBeNull()
  expect(textToCommit('First', 'First')).toBeNull()
})
