import { expect, test } from 'vite-plus/test'
import {
  effects,
  findAttributeName,
  findEffect,
  findEffectInfo,
  formatEffectModifier,
} from '../src/index.ts'

test('effects carry the game tooltip as their description', () => {
  expect(findEffect('WarmTouch')?.desc).toBeTruthy()
  expect(effects.filter((e) => e.desc).length).toBeGreaterThan(150)
})

test('Effect.isBad and the duration come from the first table row of the ID', () => {
  expect(findEffectInfo('AnewHope')).toMatchObject({ bad: false, duration: 3 })
  // `Sleep` rows say Duration 0, which the game reads as "until removed".
  expect(findEffectInfo('Sleep')).toMatchObject({ bad: false, duration: 0 })
  expect(findEffectInfo('SpaceBuzz')?.bad).toBe(false)
})

test('lookups ignore case, like the other catalogs', () => {
  expect(findEffectInfo('sleep')).toEqual(findEffectInfo('Sleep'))
})

test('effects built in code are included', () => {
  expect(findEffectInfo('GunkSick')?.bad).toBe(true)
  expect(findEffectInfo('WarmTouchFood')).toMatchObject({ bad: false, duration: 1 })
  expect(findEffectInfo('DuplicantDrankInk')?.modifiers.map((m) => m.attribute)).toContain(
    'QualityOfLife',
  )
})

test('IDs that are not effects have no info', () => {
  expect(findEffectInfo('Starving')).toBeUndefined()
  expect(findEffectInfo('NotAnEffect')).toBeUndefined()
})

test('every effect with info has a boolean flag, a non-negative duration and numeric modifiers', () => {
  let withInfo = 0
  for (const effect of effects) {
    const info = findEffectInfo(effect.id)
    if (!info) continue
    withInfo += 1
    expect(typeof info.bad).toBe('boolean')
    expect(info.duration).toBeGreaterThanOrEqual(0)
    for (const modifier of info.modifiers) expect(Number.isFinite(modifier.value)).toBe(true)
  }
  expect(withInfo).toBeGreaterThan(170)
})

test('modifiers format like "-4 Athletics" and "-20/cycle Stress"', () => {
  const modifiers = findEffectInfo('NoLubricationMinor')!.modifiers
  const athletics = modifiers.find((m) => m.attribute === 'Athletics')!
  expect(formatEffectModifier(athletics, findAttributeName('Athletics'))).toEqual({
    label: 'Athletics',
    text: '-4',
    tone: 'bad',
  })
  const stress = findEffectInfo('Sleep')!.modifiers.find((m) => m.attribute === 'StressDelta')!
  expect(formatEffectModifier(stress, findAttributeName('StressDelta'))).toEqual({
    label: 'Stress',
    text: '-20/cycle',
    tone: 'good',
  })
})

test('per-second rates are shown per cycle and multipliers as percentages', () => {
  expect(
    formatEffectModifier(
      { attribute: 'BreathDelta', value: 1, units: 'PerSecond', multiplier: false },
      'Breath',
    )?.text,
  ).toBe('+600/cycle')
  expect(
    formatEffectModifier(
      { attribute: 'MaturityDelta', value: 0.5, units: 'Flat', multiplier: true },
      undefined,
    ),
  ).toEqual({ label: 'Maturity', text: '+50%', tone: 'good' })
  expect(
    formatEffectModifier({ attribute: '', value: 1, units: 'Flat', multiplier: false }, undefined),
  ).toBeUndefined()
})
