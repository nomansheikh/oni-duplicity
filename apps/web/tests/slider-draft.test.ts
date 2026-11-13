import { expect, test } from 'vite-plus/test'
import { shownSliderValues, valueKey } from '../src/lib/slider-draft.ts'

test('an uncontrolled or untouched slider shows its value', () => {
  expect(shownSliderValues(undefined, undefined, false)).toBeUndefined()
  expect(shownSliderValues([40], undefined, true)).toEqual([40])
})

test('the thumb follows the pointer while dragging', () => {
  expect(shownSliderValues([0], { values: [60], from: '0' }, true)).toEqual([60])
})

test('a value that arrives mid-drag does not yank the thumb', () => {
  expect(shownSliderValues([100], { values: [60], from: '0' }, true)).toEqual([60])
})

test('after release the draft stands until the committed value comes back', () => {
  const draft = { values: [60], from: valueKey([0]) }
  expect(shownSliderValues([0], draft, false)).toEqual([60])
  expect(shownSliderValues([60], draft, false)).toEqual([60])
})

test('a drag that ends where it started does not pin the thumb for later changes', () => {
  // Drag Bladder away from 0 and back: Radix commits nothing. Then "fill needs" sets 100.
  const draft = { values: [0], from: valueKey([0]) }
  expect(shownSliderValues([100], draft, false)).toEqual([100])
})

test('a released draft gives way to any new value, clamped or not', () => {
  const draft = { values: [120], from: valueKey([50]) }
  expect(shownSliderValues([100], draft, false)).toEqual([100])
})
