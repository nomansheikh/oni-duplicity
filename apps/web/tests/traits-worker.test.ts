import { existsSync, readFileSync } from 'node:fs'
import { parseSave, writeSaveParts } from '@oni-duplicity/save-parser'
import { describe, expect, test } from 'vite-plus/test'
import { toProfile } from '../src/lib/format.ts'
import { applyEdit, listDuplicants } from '../src/worker/model.ts'
import { bionicSave, galaxy } from './traits-helpers.ts'

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
