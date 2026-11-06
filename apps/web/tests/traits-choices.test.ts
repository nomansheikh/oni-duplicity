import { traits as catalogTraits } from '@oni-duplicity/game-data'
import { describe, expect, test } from 'vite-plus/test'
import {
  heldConflicts,
  searchTraitChoices,
  traitChoices,
  type TraitSubject,
} from '../src/lib/traits.ts'

// --- The add-trait list ---------------------------------------------------------------

const catalog = catalogTraits
const view = (over: Partial<TraitSubject> = {}): TraitSubject => ({
  model: 'Minion',
  dlcIds: [],
  traits: [],
  interests: [],
  ...over,
})
const interest = (id: string, active: boolean) => ({ id, name: id, active })
const held = (...ids: string[]) => ids.map((id) => ({ id, name: id }))
const stateOf = (subject: TraitSubject, id: string) =>
  traitChoices(subject, catalog).choices.find((c) => c.trait.id === id)

describe('the add-trait list', () => {
  test('hides DLC traits the save lacks and offers them when it has the DLC', () => {
    expect(stateOf(view(), 'Loner')).toBeUndefined()
    expect(stateOf(view({ dlcIds: ['EXPANSION1_ID'] }), 'Loner')?.state).toBe('available')
    expect(traitChoices(view(), catalog).hidden).toBeGreaterThan(0)
  })

  test('offers standard traits to standard duplicants and bionic traits to bionics', () => {
    const dlc = ['EXPANSION1_ID', 'DLC3_ID']
    const standard = view({ dlcIds: dlc })
    const bionic = view({ dlcIds: dlc, model: 'BionicMinion' })
    expect(stateOf(standard, 'Anemic')?.state).toBe('available')
    expect(stateOf(bionic, 'Anemic')).toBeUndefined()
    expect(stateOf(standard, 'BionicBug1')).toBeUndefined()
    expect(stateOf(bionic, 'BionicBug1')?.state).toBe('available')
    expect(stateOf(bionic, 'StartWithBooster_Dig1')?.state).toBe('available')
    expect(stateOf(standard, 'StartWithBooster_Dig1')).toBeUndefined()
  })

  test('never offers traits the game does not define', () => {
    expect(stateOf(view({ dlcIds: ['DLC3_ID'] }), 'Fussy')).toBeUndefined()
    expect(stateOf(view({ dlcIds: ['DLC3_ID'] }), 'Anxious')).toBeUndefined()
  })

  test('blocks a trait that clashes with a trait the duplicant has, with the reason', () => {
    const choice = stateOf(view({ traits: held('MoleHands') }), 'CantDig')!
    expect(choice.state).toBe('conflict')
    expect(choice.reason).toBe("Can't be combined with the trait MoleHands.")
  })

  test('blocks a trait that clashes with an interest', () => {
    const subject = view({ interests: [interest('Mining', true), interest('Art', false)] })
    expect(stateOf(subject, 'CantDig')).toMatchObject({
      state: 'conflict',
      reason: "Can't be combined with the Mining interest.",
    })
    expect(stateOf(subject, 'Uncultured')?.state).toBe('available')
  })

  test('lists both causes when several apply', () => {
    const subject = view({
      traits: held('MoleHands'),
      interests: [interest('Mining', true)],
    })
    expect(stateOf(subject, 'CantDig')?.reason).toBe(
      "Can't be combined with the trait MoleHands and the Mining interest.",
    )
  })

  test('marks a held trait and leaves unrelated traits available', () => {
    const subject = view({ traits: held('Anemic') })
    expect(stateOf(subject, 'Anemic')?.state).toBe('held')
    expect(stateOf(subject, 'IronGut')?.state).toBe('available')
  })

  test('ranks an exact name or ID first and needs every word to match', () => {
    const all = traitChoices(view({ dlcIds: ['EXPANSION1_ID'] }), catalog).choices
    const ids = (q: string) => searchTraitChoices(all, q).map((c) => c.trait.id)
    expect(ids('Anemic')[0]).toBe('Anemic')
    expect(ids('anemic')).toContain('Anemic')
    // Foodie is Gourmet in game; its ID still finds it, and a word of a name finds that trait.
    expect(ids('Foodie')[0]).toBe('Foodie')
    expect(ids('gourmet')).toEqual(['Foodie'])
    expect(ids('tastes')).toEqual(['SimpleTastes'])
    expect(ids('zzzz')).toEqual([])
    expect(searchTraitChoices(all, '  ')).toBe(all)
  })

  test('reports conflicts already in a save without removing anything', () => {
    const subject = view({ traits: held('MoleHands', 'CantDig') })
    const found = heldConflicts(subject, catalog)
    expect([...found.keys()].sort()).toEqual(['CantDig', 'MoleHands'])
  })
})
