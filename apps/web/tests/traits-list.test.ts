import { readFileSync } from 'node:fs'
import { parseSave } from '@oni-duplicity/save-parser'
import { describe, expect, test } from 'vite-plus/test'
import { searchDuplicants, sortDuplicants, masteredOf, stressOf } from '../src/lib/duplicants.ts'
import { listDuplicants, type DuplicantView } from '../src/worker/model.ts'
import { galaxy } from './traits-helpers.ts'

// --- Searching and sorting the list ----------------------------------------------------

describe('the duplicant list', () => {
  const dupes = listDuplicants(parseSave(readFileSync(galaxy)))
  const names = (list: DuplicantView[]) => list.map((d) => d.name)

  test('searches by name', () => {
    expect(names(searchDuplicants(dupes, 'researcher'))).toEqual(['Researcher'])
  })

  test('searches by trait name or id', () => {
    const withTrait = dupes.filter((d) => d.traits.some((t) => t.id === 'BingeEater'))
    expect(withTrait.length).toBeGreaterThan(0)
    expect(searchDuplicants(dupes, 'binge eater')).toEqual(withTrait)
    expect(searchDuplicants(dupes, 'BingeEater')).toEqual(withTrait)
  })

  test('searches by active interest only', () => {
    const interestName = dupes[0]!.interests.find((i) => i.active)!.name
    const found = searchDuplicants(dupes, interestName)
    expect(found).toContain(dupes[0])
    for (const d of found as DuplicantView[]) {
      const hits =
        d.name.toLowerCase().includes(interestName.toLowerCase()) ||
        d.traits.some((t) => t.name.toLowerCase().includes(interestName.toLowerCase())) ||
        d.interests.some((i) => i.active && i.name === interestName)
      expect(hits).toBe(true)
    }
  })

  test('needs every word to match, and finds nothing for nonsense', () => {
    expect(searchDuplicants(dupes, 'researcher binge')).toHaveLength(
      dupes.filter((d) => d.name === 'Researcher' && d.traits.some((t) => /binge/i.test(t.name)))
        .length,
    )
    expect(searchDuplicants(dupes, 'zzzz-not-here')).toEqual([])
    expect(searchDuplicants(dupes, '  ')).toBe(dupes)
  })

  test('sorts by name, both ways', () => {
    const asc = names(sortDuplicants(dupes, 'name', false))
    expect(asc).toEqual([...asc].sort((a, b) => a.localeCompare(b)))
    expect(names(sortDuplicants(dupes, 'name', true))).toEqual([...asc].reverse())
  })

  test('sorts by arrival, experience, skills and stress', () => {
    const arrival = sortDuplicants(dupes, 'arrival', false).map((d) => d.arrivalTime)
    expect(arrival).toEqual([...arrival].sort((a, b) => a - b))
    const xp = sortDuplicants(dupes, 'experience', true).map((d) => d.experience)
    expect(xp).toEqual([...xp].sort((a, b) => b - a))
    const skills = sortDuplicants(dupes, 'skills', true).map(masteredOf)
    expect(skills).toEqual([...skills].sort((a, b) => b - a))
    const stress = sortDuplicants(dupes, 'stress', false).map(stressOf)
    expect(stress).toEqual([...stress].sort((a, b) => a - b))
  })

  test('sorts standard before bionic, and keeps the save order for ties', () => {
    const mixed: DuplicantView[] = [
      { ...dupes[0]!, name: 'B1', isBionic: true },
      { ...dupes[1]!, name: 'S1', isBionic: false },
      { ...dupes[2]!, name: 'B2', isBionic: true },
      { ...dupes[3]!, name: 'S2', isBionic: false },
    ]
    expect(names(sortDuplicants(mixed, 'model', false))).toEqual(['S1', 'S2', 'B1', 'B2'])
    expect(names(sortDuplicants(mixed, 'model', true))).toEqual(['B1', 'B2', 'S1', 'S2'])
    expect(sortDuplicants(dupes, 'save', false)).toBe(dupes)
  })

  test('does not reorder the original list', () => {
    const copy = [...dupes]
    sortDuplicants(dupes, 'name', true)
    expect(dupes).toEqual(copy)
  })
})
