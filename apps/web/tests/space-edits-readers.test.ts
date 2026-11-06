import { expect, test } from 'vite-plus/test'
import {
  listPoiOverview,
  readFog,
  readHarvestState,
  saveGameController,
} from '../src/worker/pois.ts'
import { galaxy } from './helpers.ts'
import { load, poiController, withInt } from './space-edits-helpers.ts'

test('the fog reader rejects counts that cannot be real', () => {
  const bytes = saveGameController(load(galaxy))!.extraRaw
  const fog = readFog(bytes)!
  // The count sits right before the values; the length ints are two and three ints before it.
  const countAt = fog.valuesAt - 4
  expect(readFog(bytes)).not.toBeNull()
  for (const count of [-1, -1000, 2_000_000]) {
    let forged = withInt(bytes, countAt, count)
    forged = withInt(forged, countAt - 4, count * 16)
    forged = withInt(forged, countAt - 8, count * 16 + 8)
    expect(readFog(forged), `count ${count}`).toBeNull()
  }
}, 120_000)

test('the stock reader checks the parameter against the instance it belongs to', () => {
  const save = load(galaxy)
  const poi = listPoiOverview(save).pois.find((p) => p.harvest)!
  const bytes = poiController(save, poi.id).extraRaw
  const state = readHarvestState(bytes)!
  // The instance length sits 24 bytes before the stock float, after the state name.
  const lengthAt = state.capacityAt - 24
  expect(readHarvestState(withInt(bytes, lengthAt, 0))).toBeNull()
  expect(readHarvestState(withInt(bytes, lengthAt, -5))).toBeNull()
  // A length that ends before the parameter, or past the bytes, is not this layout.
  expect(
    readHarvestState(withInt(bytes, lengthAt, state.parameterAt - state.capacityAt)),
  ).toBeNull()
  expect(readHarvestState(withInt(bytes, lengthAt, bytes.length))).toBeNull()
  // The parameter name must carry its own length prefix.
  expect(readHarvestState(withInt(bytes, state.parameterAt - 4 - 11, 12))).toBeNull()
}, 120_000)
