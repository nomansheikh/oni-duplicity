import { existsSync, readFileSync } from 'node:fs'
import { findTraitInfo, traits as catalogTraits } from '@oni-duplicity/game-data'
import { parseSave, writeSaveParts } from '@oni-duplicity/save-parser'
import { describe, expect, test } from 'vite-plus/test'
import { applyEdit, listDuplicants, type DuplicantView } from '../src/worker/model.ts'
import { traitChoices } from '../src/lib/traits.ts'
import { bionicSave, fixtures, galaxy } from './traits-helpers.ts'

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
