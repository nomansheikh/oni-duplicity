import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { findTraitInfo, traits as catalogTraits } from '@oni-duplicity/game-data'
import { parseSave, writeSaveParts } from '@oni-duplicity/save-parser'
import { describe, expect, test } from 'vite-plus/test'
import { searchDuplicants, sortDuplicants, masteredOf, stressOf } from '../src/lib/duplicants.ts'
import { toProfile } from '../src/lib/format.ts'
import { blockedSections, profileModel } from '../src/lib/profile.ts'
import {
  heldConflicts,
  searchTraitChoices,
  traitChoices,
  type TraitSubject,
} from '../src/lib/traits.ts'
import { applyEdit, listDuplicants, type DuplicantView } from '../src/worker/model.ts'

const testData = fileURLToPath(new URL('../../../test-data/', import.meta.url))
const manifest = JSON.parse(readFileSync(`${testData}fixtures.json`, 'utf8')) as {
  fixtures: { file: string; committed: boolean }[]
}
const pathOf = (file: string) => {
  const entry = manifest.fixtures.find((f) => f.file === file)!
  return `${testData}${entry.committed ? 'saves' : 'fetched'}/${file}`
}
const fixtures = manifest.fixtures.map((f) => pathOf(f.file)).filter((p) => existsSync(p))
const galaxy = pathOf('beautiful-galaxy.sav')
const bionicSave = pathOf('mithro-06-maximum-cycle-4770.sav')

/** Traits on fixture duplicants the table does not cover, with the reason. */
const KNOWN_EXCEPTIONS: Record<string, string> = {}

/** Every fixture's duplicants, listed once for the two tests below. */
const everyDuplicant = (() => {
  let cache: DuplicantView[] | undefined
  return () => (cache ??= fixtures.flatMap((path) => listDuplicants(parseSave(readFileSync(path)))))
})()

test('every trait on a fixture duplicant is in the table or a known exception', () => {
  const unknown = new Set<string>()
  let seen = 0
  for (const d of everyDuplicant()) {
    for (const t of d.traits) {
      seen++
      if (!findTraitInfo(t.id) && !(t.id in KNOWN_EXCEPTIONS)) unknown.add(t.id)
    }
  }
  // The committed saves alone hold 21 duplicants; the full tier adds more.
  expect(everyDuplicant().length).toBeGreaterThanOrEqual(21)
  expect(seen).toBeGreaterThan(0)
  expect([...unknown]).toEqual([])
  // The catalog spells the ID as the saves do.
  expect(catalogTraits.some((t) => t.id === 'RoboDancer')).toBe(true)
}, 600_000)

test('fixture traits respect the model rules the table claims', () => {
  for (const d of everyDuplicant()) {
    for (const t of d.traits) {
      expect(findTraitInfo(t.id)!.models, `${t.name} on ${d.name} (${d.model})`).toContain(d.model)
    }
  }
}, 600_000)

// --- Adding a trait --------------------------------------------------------------

function addsOnlyTrait(file: string, pick: (d: DuplicantView) => boolean): void {
  const save = parseSave(readFileSync(file))
  const dupe = listDuplicants(save).find(pick)!
  expect(dupe).toBeDefined()
  const choice = traitChoices(dupe, catalogTraits).choices.find((c) => c.state === 'available')!
  expect(choice).toBeDefined()
  const before = writeSaveParts(save).body.slice()

  applyEdit(save, { type: 'addTrait', id: dupe.id, traitId: choice.trait.id })

  expect(
    listDuplicants(save)
      .find((d) => d.id === dupe.id)!
      .traits.map((t) => t.id),
  ).toEqual([...dupe.traits.map((t) => t.id), choice.trait.id])
  // The written save is the original plus one inserted string (a 4-byte length and the
  // characters). Cut the string out and the rest differs only in the few length and count
  // fields that cover the trait list.
  const after = writeSaveParts(save).body
  const id = new TextEncoder().encode(choice.trait.id)
  const inserted = 4 + id.length
  expect(after.length).toBe(before.length + inserted)
  const at = Buffer.from(after.buffer, after.byteOffset, after.length).indexOf(
    Buffer.concat([Buffer.from(new Uint32Array([id.length]).buffer), id]),
    // The new entry sits in this duplicant's list, so no earlier than where the files differ.
    firstDifference(before, after) - 1,
  )
  expect(at).toBeGreaterThan(0)
  const differing: number[] = []
  for (let i = 0; i < before.length; i++) {
    if (before[i] !== after[i < at ? i : i + inserted]) differing.push(i)
  }
  // The trait list's count, plus the length of the behavior (and of anything enclosing it).
  expect(differing.length).toBeLessThanOrEqual(16)
  expect(differing.length).toBeGreaterThan(0)
}

function firstDifference(a: Uint8Array, b: Uint8Array): number {
  let i = 0
  while (a[i] === b[i]) i++
  return i
}

describe('adding an allowed trait', () => {
  test("changes only that standard duplicant's traits", () => {
    addsOnlyTrait(galaxy, (d) => !d.isBionic)
  }, 120_000)

  test.runIf(existsSync(bionicSave))(
    "changes only that bionic duplicant's traits",
    () => {
      addsOnlyTrait(bionicSave, (d) => d.isBionic)
    },
    300_000,
  )
})

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

// --- Pasting a profile across models ------------------------------------------------

describe('pasting a profile onto the other model', () => {
  const standard = () => {
    const save = parseSave(readFileSync(galaxy))
    return { save, dupes: listDuplicants(save) }
  }

  test('reads the model from the profile, or from its traits for older exports', () => {
    expect(profileModel({ model: 'BionicMinion', traits: [] })).toBe('BionicMinion')
    expect(profileModel({ traits: ['BionicBug2', 'Aggressive'] })).toBe('BionicMinion')
    expect(profileModel({ traits: ['Anemic'] })).toBe('Minion')
    expect(blockedSections({ traits: ['Anemic'] }, 'Minion')).toEqual([])
    expect(blockedSections({ traits: ['Anemic'] }, 'BionicMinion')).toEqual([
      'traits',
      'interests',
      'skills',
      'appearance',
    ])
  })

  test('refuses traits and skills from a bionic profile, and changes nothing', () => {
    const { save, dupes } = standard()
    const target = dupes[0]!
    const bionicProfile = {
      ...toProfile(target),
      model: 'BionicMinion' as const,
      traits: ['BionicBug1'],
      skills: ['Mining1'],
    }
    const before = writeSaveParts(save).body.slice()
    for (const section of ['traits', 'interests', 'skills', 'appearance'] as const) {
      expect(() =>
        applyEdit(save, {
          type: 'applyProfile',
          id: target.id,
          profile: bionicProfile,
          sections: [section],
        }),
      ).toThrow(/cannot be applied to a standard duplicant/)
    }
    expect(Buffer.compare(writeSaveParts(save).body, before)).toBe(0)
    expect(listDuplicants(save)[0]!.traits.map((t) => t.id)).toEqual(target.traits.map((t) => t.id))
  })

  test('still applies name and attributes across models', () => {
    const { save, dupes } = standard()
    const target = dupes[0]!
    const profile = { ...toProfile(dupes[1]!), model: 'BionicMinion' as const }
    applyEdit(save, {
      type: 'applyProfile',
      id: target.id,
      profile,
      sections: ['name', 'attributes'],
    })
    const after = listDuplicants(save)[0]!
    expect(after.name).toBe(dupes[1]!.name)
    expect(after.traits.map((t) => t.id)).toEqual(target.traits.map((t) => t.id))
  })

  test('applies a same-model profile in full', () => {
    const { save, dupes } = standard()
    const profile = toProfile(dupes[1]!)
    expect(profile.model).toBe('Minion')
    applyEdit(save, {
      type: 'applyProfile',
      id: dupes[0]!.id,
      profile,
      sections: ['traits', 'interests', 'skills'],
    })
    expect(listDuplicants(save)[0]!.traits.map((t) => t.id)).toEqual(
      dupes[1]!.traits.map((t) => t.id),
    )
  })

  test.runIf(existsSync(bionicSave))(
    'refuses a standard profile on a bionic duplicant',
    () => {
      const save = parseSave(readFileSync(bionicSave))
      const dupes = listDuplicants(save)
      const bionic = dupes.find((d) => d.isBionic)!
      const profile = toProfile(dupes.find((d) => !d.isBionic)!)
      expect(() =>
        applyEdit(save, {
          type: 'applyProfile',
          id: bionic.id,
          profile,
          sections: ['traits', 'skills'],
        }),
      ).toThrow(/standard profile's traits, skills cannot be applied to a bionic duplicant/)
      expect(listDuplicants(save).find((d) => d.id === bionic.id)!.traits).toEqual(bionic.traits)
    },
    300_000,
  )
})

// --- The worker refuses what the picker would hide ------------------------------------

describe('the worker enforces the model and DLC rules', () => {
  const load = () => {
    const save = parseSave(readFileSync(galaxy))
    return { save, dupes: listDuplicants(save) }
  }
  const bytes = (save: ReturnType<typeof parseSave>) => writeSaveParts(save).body.slice()

  test('addTrait refuses a trait the model cannot have and changes nothing', () => {
    const { save, dupes } = load()
    const before = bytes(save)
    expect(() =>
      applyEdit(save, { type: 'addTrait', id: dupes[0]!.id, traitId: 'BionicBug1' }),
    ).toThrow(/BionicBug1 is not a trait standard duplicants can have/)
    expect(() => applyEdit(save, { type: 'addTrait', id: dupes[0]!.id, traitId: 'Fussy' })).toThrow(
      /not a trait the game defines/,
    )
    expect(Buffer.compare(bytes(save), before)).toBe(0)
  })

  test('addTrait refuses a DLC trait in a save without the DLC, and allows it with', () => {
    const { save, dupes } = load()
    save.header.gameInfo.dlcIds = []
    const before = bytes(save)
    expect(() => applyEdit(save, { type: 'addTrait', id: dupes[0]!.id, traitId: 'Loner' })).toThrow(
      /Loner needs a DLC this save does not have/,
    )
    expect(Buffer.compare(bytes(save), before)).toBe(0)
    save.header.gameInfo.dlcIds = ['EXPANSION1_ID']
    applyEdit(save, { type: 'addTrait', id: dupes[0]!.id, traitId: 'Loner' })
    expect(listDuplicants(save)[0]!.traits.map((t) => t.id)).toContain('Loner')
  })

  test('a profile with traits the save cannot have is refused whole', () => {
    const { save, dupes } = load()
    save.header.gameInfo.dlcIds = []
    const profile = { ...toProfile(dupes[1]!), traits: ['IronGut', 'Loner'] }
    const before = bytes(save)
    expect(() =>
      applyEdit(save, {
        type: 'applyProfile',
        id: dupes[0]!.id,
        profile,
        sections: ['name', 'traits'],
      }),
    ).toThrow(/Loner needs a DLC/)
    expect(Buffer.compare(bytes(save), before)).toBe(0)
  })

  test('a duplicant without a saved model falls back to its prefab', () => {
    const { save, dupes } = load()
    const identity = save.gameObjects
      .find((g) => g.name === 'Minion')!
      .gameObjects[0]!.behaviors.find((b) => b.name === 'MinionIdentity')!.templateData!
    delete identity.model
    expect(listDuplicants(save)[0]!.model).toBe('Minion')
    const bionicProfile = { ...toProfile(dupes[1]!), model: 'BionicMinion' as const }
    expect(() =>
      applyEdit(save, {
        type: 'applyProfile',
        id: dupes[0]!.id,
        profile: bionicProfile,
        sections: ['traits'],
      }),
    ).toThrow(/cannot be applied to a standard duplicant/)
  })

  test.runIf(existsSync(bionicSave))(
    'a bionic without a saved model is still bionic',
    () => {
      const save = parseSave(readFileSync(bionicSave))
      const group = save.gameObjects.find((g) => g.name === 'BionicMinion')!
      const identity = group.gameObjects[0]!.behaviors.find(
        (b) => b.name === 'MinionIdentity',
      )!.templateData!
      delete identity.model
      const dupes = listDuplicants(save)
      const bionic = dupes.find((d) => d.id === 'BionicMinion:0')!
      expect(bionic.model).toBe('BionicMinion')
      expect(() => applyEdit(save, { type: 'addTrait', id: bionic.id, traitId: 'Anemic' })).toThrow(
        /not a trait bionic duplicants can have/,
      )
      const standard = toProfile(dupes.find((d) => !d.isBionic)!)
      expect(() =>
        applyEdit(save, {
          type: 'applyProfile',
          id: bionic.id,
          profile: standard,
          sections: ['traits'],
        }),
      ).toThrow(/cannot be applied to a bionic duplicant/)
    },
    300_000,
  )
})

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
