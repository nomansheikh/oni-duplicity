import { expect, test } from 'vite-plus/test'
import {
  findTrait,
  inertTraitIds,
  skillGroups,
  traitConflicts,
  traitInfo,
  traitUnavailable,
  traits,
} from '../src/index.ts'

const count = (category: string) => traitInfo.filter((t) => t.category === category).length

test('the table has the trait lists of the decompile', () => {
  // GOODTRAITS 42, BADTRAITS 28, CONGENITALTRAITS 6 (with None), GENESHUFFLERTRAITS 4,
  // BIONICBUGTRAITS 7 and 10 StartWith boosters.
  expect(count('positive')).toBe(42)
  expect(count('negative')).toBe(28)
  expect(count('congenital')).toBe(6)
  expect(count('genetic')).toBe(4)
  expect(count('bionic')).toBe(17)
  expect(count('joy')).toBe(7)
  expect(count('need')).toBe(7)
  expect(count('stress')).toBe(6)
  expect(count('special')).toBe(24)
  expect(new Set(traitInfo.map((t) => t.id.toLowerCase())).size).toBe(traitInfo.length)
})

test('every trait in the table is in the catalog, except the needs the strings lack', () => {
  const missing = traitInfo.filter((t) => !findTrait(t.id)).map((t) => t.id)
  expect(missing.filter((id) => id !== 'None')).toEqual(
    traitInfo.filter((t) => t.category === 'need').map((t) => t.id),
  )
})

test('every catalog trait is categorised, inert, or named in the known exceptions', () => {
  const unknown = traits
    .filter((t) => !traitInfo.some((i) => i.id === t.id) && !inertTraitIds.includes(t.id))
    .map((t) => t.id)
  expect(unknown).toEqual([])
})

test('exclusions only name known traits and interests', () => {
  const ids = new Set(traitInfo.map((t) => t.id))
  const groups = new Set(skillGroups.map((g) => g.id.toLowerCase()))
  for (const t of traitInfo) {
    for (const other of t.excludesTraits) expect(ids.has(other), `${t.id} → ${other}`).toBe(true)
    for (const interest of t.excludesInterests) {
      expect(groups.has(interest.toLowerCase()), `${t.id} → ${interest}`).toBe(true)
    }
  }
})

test('the catalog spells RoboDancer as the game saves it', () => {
  expect(traits.some((t) => t.id === 'RoboDancer')).toBe(true)
  expect(traits.some((t) => t.id === 'Robodancer')).toBe(false)
})

test('a pair conflicts when either trait lists the other', () => {
  // Only EarlyBird lists NightOwl and only NightOwl lists EarlyBird: both directions are listed.
  expect(traitConflicts('NightOwl', ['EarlyBird'], [])).toEqual([
    { kind: 'trait', id: 'EarlyBird' },
  ])
  // CantBuild lists GrantSkill_Engineering1, which does not list CantBuild back.
  expect(traitConflicts('GrantSkill_Engineering1', ['CantBuild'], [])).toEqual([
    { kind: 'trait', id: 'CantBuild' },
  ])
  expect(traitConflicts('CantBuild', ['GrantSkill_Engineering1'], [])).toHaveLength(1)
  expect(traitConflicts('Twinkletoes', ['IronGut', 'StrongArm'], [])).toEqual([])
})

test('a trait conflicts with the interests it excludes', () => {
  expect(traitConflicts('CantDig', [], ['Mining', 'Art'])).toEqual([
    { kind: 'interest', id: 'Mining' },
  ])
  // The catalog spells the Research interest in lower case.
  expect(traitConflicts('CantResearch', [], ['research'])).toEqual([
    { kind: 'interest', id: 'Research' },
  ])
  expect(traitConflicts('CantDig', [], ['Art'])).toEqual([])
  // Interests excluded by a trait the duplicant has are not checked from the other side.
  expect(traitConflicts('IronGut', ['CantDig'], ['Mining'])).toEqual([])
})

test('a trait never conflicts with itself, and unknown traits never conflict', () => {
  expect(traitConflicts('Anemic', ['Anemic'], [])).toEqual([])
  expect(traitConflicts('SomeModTrait', ['Anemic'], ['Mining'])).toEqual([])
})

test('traits are filtered by model and DLC', () => {
  const all = ['EXPANSION1_ID', 'DLC2_ID', 'DLC3_ID', 'DLC4_ID', 'DLC5_ID']
  expect(traitUnavailable('Anemic', 'Minion', all)).toBeUndefined()
  expect(traitUnavailable('Anemic', 'BionicMinion', all)).toBe('model')
  expect(traitUnavailable('BionicBug1', 'Minion', all)).toBe('model')
  expect(traitUnavailable('BionicBug1', 'BionicMinion', all)).toBeUndefined()
  expect(traitUnavailable('BionicBug1', 'BionicMinion', ['EXPANSION1_ID'])).toBe('dlc')
  expect(traitUnavailable('Loner', 'Minion', [])).toBe('dlc')
  expect(traitUnavailable('Loner', 'Minion', ['EXPANSION1_ID'])).toBeUndefined()
  expect(traitUnavailable('Aggressive', 'BionicMinion', all)).toBeUndefined()
  expect(traitUnavailable('Fussy', 'Minion', all)).toBe('inert')
  expect(traitUnavailable('SomeModTrait', 'Minion', [])).toBeUndefined()
})
