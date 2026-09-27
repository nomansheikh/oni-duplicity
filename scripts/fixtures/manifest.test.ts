import { describe, expect, test } from 'vite-plus/test'
import { parseManifest, selectFixtures, type Fixture } from './manifest.ts'

const fixture = (overrides: Partial<Fixture> = {}): Fixture => ({
  file: 'example.sav',
  sha256: 'a'.repeat(64),
  size: 1,
  tier: 'small',
  committed: false,
  saveVersion: '7.38',
  dlcIds: [],
  cycles: 1,
  duplicants: 3,
  source: 'test',
  upstream: null,
  license: 'CC0-1.0',
  ...overrides,
})

const manifest = (fixtures: Fixture[]) => ({ baseUrl: 'https://example.com/fixtures', fixtures })

describe('parseManifest', () => {
  test('accepts a valid manifest', () => {
    const parsed = parseManifest(manifest([fixture()]))
    expect(parsed.fixtures).toHaveLength(1)
    expect(parsed.baseUrl).toBe('https://example.com/fixtures')
  })

  test('rejects a non-https base URL', () => {
    expect(() => parseManifest({ baseUrl: 'http://example.com', fixtures: [] })).toThrow(/https/)
  })

  test('rejects file names with path separators', () => {
    expect(() => parseManifest(manifest([fixture({ file: '../evil.sav' })]))).toThrow(/file name/)
    expect(() => parseManifest(manifest([fixture({ file: 'sub/evil.sav' })]))).toThrow(/file name/)
  })

  test('rejects duplicate files', () => {
    expect(() => parseManifest(manifest([fixture(), fixture()]))).toThrow(/Duplicate/)
  })

  test('rejects malformed checksums', () => {
    expect(() => parseManifest(manifest([fixture({ sha256: 'abc' })]))).toThrow(/sha256/)
  })

  test('rejects unknown tiers', () => {
    expect(() => parseManifest(manifest([fixture({ tier: 'huge' as Fixture['tier'] })]))).toThrow(
      /tier/,
    )
  })
})

describe('selectFixtures', () => {
  const all = parseManifest(
    manifest([fixture({ file: 'a.sav', tier: 'small' }), fixture({ file: 'b.sav', tier: 'full' })]),
  )

  test('small selects only the small tier', () => {
    expect(selectFixtures(all, 'small').map((f) => f.file)).toEqual(['a.sav'])
  })

  test('all selects every fixture', () => {
    expect(selectFixtures(all, 'all').map((f) => f.file)).toEqual(['a.sav', 'b.sav'])
  })
})
