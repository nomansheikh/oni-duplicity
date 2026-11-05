import { describe, expect, it } from 'vite-plus/test'
import { readPlans, writePlan } from './plan-storage'

function memory(initial?: string) {
  const data = new Map<string, string>(initial ? [['duplicity:skill-plans', initial]] : [])
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

describe('plan storage', () => {
  it('round-trips a plan and removes it when emptied', () => {
    const s = memory()
    writePlan('a', ['Mining1'], s)
    expect(readPlans(s)).toEqual({ a: ['Mining1'] })
    writePlan('a', [], s)
    expect(readPlans(s)).toEqual({})
  })

  it('ignores garbage', () => {
    expect(readPlans(memory('not json'))).toEqual({})
    expect(readPlans(memory('{"a":[1],"b":["x"]}'))).toEqual({ b: ['x'] })
  })
})
