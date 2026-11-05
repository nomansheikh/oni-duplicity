import { expect, test } from 'vite-plus/test'
import { DEFAULT_ITERATIONS, parseBenchArgs } from './args.ts'

test('defaults to checking with the default iteration count', () => {
  expect(parseBenchArgs([])).toEqual({
    update: false,
    require: false,
    iterations: DEFAULT_ITERATIONS,
  })
})

test('parses every flag', () => {
  expect(parseBenchArgs(['--update', '--require', '--iterations', '3'])).toEqual({
    update: true,
    require: true,
    iterations: 3,
  })
})

test('rejects unknown flags and bad iteration counts', () => {
  expect(() => parseBenchArgs(['--tier', 'all'])).toThrow('Unknown argument')
  expect(() => parseBenchArgs(['--iterations', '0'])).toThrow('positive integer')
  expect(() => parseBenchArgs(['--iterations'])).toThrow('positive integer')
})
