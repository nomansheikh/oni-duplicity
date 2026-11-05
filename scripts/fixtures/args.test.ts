import { expect, test } from 'vite-plus/test'
import { parseFixtureArgs, parseTierArg } from './args.ts'

test('defaults to all', () => {
  expect(parseTierArg([])).toBe('all')
})

test('accepts --tier small and --tier all', () => {
  expect(parseTierArg(['--tier', 'small'])).toBe('small')
  expect(parseTierArg(['--tier', 'all'])).toBe('all')
})

test('rejects unknown tiers, missing values and unknown flags', () => {
  expect(() => parseTierArg(['--tier', 'huge'])).toThrow(/--tier/)
  expect(() => parseTierArg(['--tier'])).toThrow(/--tier/)
  expect(() => parseTierArg(['--force'])).toThrow(/Unknown argument/)
})

test('collects repeated --file arguments', () => {
  expect(parseFixtureArgs(['--file', 'a.sav', '--file', 'b.sav'])).toEqual({
    tier: 'all',
    files: ['a.sav', 'b.sav'],
  })
  expect(() => parseFixtureArgs(['--file'])).toThrow(/--file/)
})

test('rejects --file together with --tier', () => {
  expect(() => parseFixtureArgs(['--tier', 'small', '--file', 'a.sav'])).toThrow(
    /cannot be combined/,
  )
})
