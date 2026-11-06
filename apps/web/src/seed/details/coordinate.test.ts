import { describe, expect, it } from 'vite-plus/test'
import { SEED_CLUSTERS } from '../clusters.ts'
import { checkCoordinate, hashFor, parseCoordinate, seedFromHash } from './coordinate.ts'

describe('parseCoordinate', () => {
  it('counts the parts from the end, so a hyphenated prefix survives', () => {
    expect(parseCoordinate('V-SNDST-C-1393183751-0-0-J5XRH4Y1')).toEqual({
      coordinate: 'V-SNDST-C-1393183751-0-0-J5XRH4Y1',
      prefix: 'V-SNDST-C',
      seed: 1393183751,
      settings: '0',
      story: '0',
      mixing: 'J5XRH4Y1',
    })
  })

  it('trims and upper-cases what was pasted', () => {
    expect(parseCoordinate('  sndst-a-5-0-0-0 ')?.coordinate).toBe('SNDST-A-5-0-0-0')
  })

  it('rejects anything that is not a coordinate', () => {
    expect(parseCoordinate('garbage')).toBeUndefined()
    expect(parseCoordinate('SNDST-C-5-0-0')).toBeUndefined()
    expect(parseCoordinate('SNDST-C-x-0-0-0')).toBeUndefined()
    expect(parseCoordinate('SNDST-C-99999999999-0-0-0')).toBeUndefined()
    expect(parseCoordinate('SNDST-C-5-0-0-0 ; drop')).toBeUndefined()
  })
})

describe('checkCoordinate', () => {
  it('accepts a prefix the search can generate', () => {
    const check = checkCoordinate('SNDST-A-5-0-0-0')
    expect(check.ok && check.cluster.prefix).toBe('SNDST-A')
  })

  it('opens the Skewed Asteroid clusters, which the search leaves out', () => {
    for (const prefix of ['KF23-A', 'KF23-C']) {
      const check = checkCoordinate(`${prefix}-7-0-0-0`)
      expect(check.ok && check.cluster.label).toBe('Skewed Asteroid')
      expect(SEED_CLUSTERS.some((cluster) => cluster.prefix === prefix)).toBe(false)
    }
  })

  it('says plainly when the cluster is outside the generator', () => {
    const check = checkCoordinate('NOPE-C-5-0-0-0')
    expect(check).toMatchObject({ ok: false, reason: 'unsupported' })
    expect(!check.ok && check.message).toContain('NOPE-C')
  })

  it('tells a malformed code from an unsupported one', () => {
    expect(checkCoordinate('hello')).toMatchObject({ ok: false, reason: 'invalid' })
  })
})

describe('the address hash', () => {
  it('round-trips a coordinate', () => {
    expect(seedFromHash(hashFor('SNDST-A-5-0-0-0'))).toBe('SNDST-A-5-0-0-0')
  })

  it('ignores other hashes', () => {
    expect(seedFromHash('')).toBeUndefined()
    expect(seedFromHash('#other=1')).toBeUndefined()
    expect(seedFromHash('#seed=')).toBeUndefined()
    expect(seedFromHash('#seed=%E0%A4%A')).toBeUndefined()
  })
})
