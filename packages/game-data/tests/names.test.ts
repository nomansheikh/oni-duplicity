import { expect, test } from 'vite-plus/test'
import { findDestinationName, findPrefabName } from '../src/index.ts'

test('prefab names come from the game strings, ignoring case and underscores', () => {
  expect(findPrefabName('GeneShuffler')).toBe('Neural Vacillator')
  expect(findPrefabName('OilWell')).toBe('Oil Reservoir')
  expect(findPrefabName('Headquarters')).toBe('Printing Pod')
  expect(findPrefabName('NotAPrefab')).toBeUndefined()
})

test('destinations use the string key the game names each type after', () => {
  // `HeliumGiant` is named after the `HYDROGENGIANT` string.
  expect(findDestinationName('HeliumGiant')).toBe('Helium Giant')
  expect(findDestinationName('Wormhole')).toBe('Temporal Tear')
  expect(findDestinationName('Nope')).toBeUndefined()
})
