import { existsSync, readFileSync } from 'node:fs'
import { parseSave, writeSaveParts } from '@oni-duplicity/save-parser'
import { describe, expect, test } from 'vite-plus/test'
import { toProfile } from '../src/lib/format.ts'
import { blockedSections, profileModel } from '../src/lib/profile.ts'
import { applyEdit, listDuplicants } from '../src/worker/model.ts'
import { bionicSave, galaxy } from './traits-helpers.ts'

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
