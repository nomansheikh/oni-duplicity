/**
 * Ranching data for every ranchable species and morph, read from the decompiled game
 * (https://github.com/Kupie/ONI_Decomp) by running each species config through a small C#
 * interpreter. Names come from the game's strings. Nothing here is typed in by hand: when a
 * value cannot be read it is left out and listed in `gaps`.
 */
import { Interp, type Obj, type Value } from '../csharp/interp.ts'
import type { ClassInfo } from '../csharp/source.ts'
import { createRunner, type Capture, type DlcIds, type RawModifier } from './run.ts'
import { readConstants } from './constants.ts'
import { createDietBuilder } from './diet.ts'
import { createNames, familyOf, num, text } from './species-names.ts'
import { buildProducts } from './products.ts'

import type {
  RanchDietEntry,
  RanchProductEntry,
  RanchSpecies,
  RanchingData,
} from '../../src/ranching.ts'

export type { RanchDietEntry, RanchProductEntry, RanchSpecies, RanchingData }

const trait = (traits: RawModifier[], path: string) =>
  traits.find((t) => t.attr.includes(path))?.value

/** Which species config classes to run: every `*Config` that builds a creature. */
function speciesConfigs(runnerIdx: { byName: Map<string, ClassInfo[]> }): ClassInfo[] {
  const out: ClassInfo[] = []
  for (const list of runnerIdx.byName.values()) {
    for (const cls of list) {
      if (!/Config$/.test(cls.name) || /^Base|^Baby|BabyConfig$/.test(cls.name)) continue
      const create = cls.methods.get('CreatePrefab')
      if (!create) continue
      const own = [...cls.methods.values()]
        .flat()
        .map((m) => m.body)
        .join('\n')
      if (/ExtendEntityToFertileCreature|ExtendEntityToWildCreature/.test(own)) out.push(cls)
    }
  }
  return [...new Set(out)]
}

export function extractRanching(opts: {
  decompDir: string
  gameDataDir: string
  strings: Map<string, string>
  elementName: (id: string) => string | undefined
  clean: (s: string) => string
}): { data: RanchingData; diagnostics: Map<string, number> } {
  const runner = createRunner(opts.decompDir, opts.gameDataDir)
  const gaps: string[] = []
  const { stringAt, itemName, speciesNameById, nameKeyBySpecies } = createNames({
    ...opts,
    runner,
  })

  const species: RanchSpecies[] = []

  // Pass 1: run every config.
  const runs: { id: string; capture: Capture; dlc: DlcIds }[] = []
  for (const cls of speciesConfigs(runner.idx)) {
    const { capture, dlc, id } = runner.run(cls)
    const fertile = capture.fertile
    if (!id || !capture.ranchable) continue
    if (fertile && (fertile.deprecated === true || fertile.is_ranchable === false)) continue
    runs.push({ id, capture, dlc })
    const eggName = text(fertile?.eggName as Value)
    const key = capture.nameRef ?? (eggName ? eggName.replace(/\.EGG_NAME$/, '.NAME') : undefined)
    if (key) nameKeyBySpecies.set(id, key)
    const n = stringAt(key)
    if (n) speciesNameById.set(id, n)
  }

  const buildDiet = createDietBuilder(runner, stringAt, itemName, gaps)

  for (const { id, capture, dlc } of runs) {
    const { traits } = capture
    const family = familyOf(nameKeyBySpecies.get(id))
    const calories = trait(traits, 'Calories.deltaAttribute')
    const lifespan = trait(traits, 'Age.maxAttribute')
    const stomach = trait(traits, 'Calories.maxAttribute')
    const fertile = capture.fertile
    const name = speciesNameById.get(id)
    if (!name) gaps.push(`${id}: no display name`)
    if (calories === undefined) gaps.push(`${id}: calorie burn not found`)
    if (lifespan === undefined) gaps.push(`${id}: lifespan not found`)
    if (capture.space === undefined) gaps.push(`${id}: space per critter not found`)

    const diet = buildDiet(id, capture)
    const products = buildProducts(capture, itemName)

    const chances = ((fertile?.eggChances as Obj[] | undefined) ?? []).map((c) => ({
      egg: text(c.egg as Value),
      weight: num(c.weight as Value),
    }))

    species.push({
      id,
      family: family ?? id.toUpperCase(),
      familyName: stringAt(family ? `CREATURES.SPECIES.${family}.NAME` : undefined) ?? name ?? id,
      name: name ?? id,
      dlcIds: [
        ...new Set([...dlc.required, ...((fertile?.dlc as DlcIds | undefined)?.required ?? [])]),
      ],
      forbiddenDlcIds: [
        ...new Set([...dlc.forbidden, ...((fertile?.dlc as DlcIds | undefined)?.forbidden ?? [])]),
      ],
      ...(fertile ? { babyId: text(fertile.babyId as Value) } : {}),
      spacePerCritter: capture.space ?? 0,
      lifespanCycles: lifespan ?? 0,
      caloriesPerCycle: calories === undefined ? 0 : Math.abs(calories) * 600,
      stomachCalories: stomach ?? 0,
      ...(fertile
        ? {
            egg: {
              id: text(fertile.eggId as Value),
              name: stringAt(text(fertile.eggName as Value)) ?? text(fertile.eggId as Value),
              massKg: num(fertile.eggMass as Value),
              shellRatio: num(fertile.eggShellRatio as Value),
              fertilityCycles: num(fertile.fertilityCycles as Value),
              incubationCycles: num(fertile.incubationCycles as Value),
              chances: chances.map((c) => ({ speciesId: c.egg, name: c.egg, weight: c.weight })),
            },
          }
        : {}),
      diet,
      deathDrops: capture.deaths.map((d) => ({
        id: d.id,
        name: itemName(d.id) ?? d.id,
        kg: d.count,
      })),
      swims: capture.tags.includes('Swimmer'),
      products,
    })
  }

  // Egg ids in the morph odds point at species: swap in their ids and names.
  const byEgg = new Map(species.filter((s) => s.egg).map((s) => [s.egg!.id, s]))
  for (const s of species) {
    if (!s.egg) continue
    s.egg.chances = s.egg.chances.map((c) => {
      const target = byEgg.get(c.speciesId)
      if (!target) gaps.push(`${s.id}: egg ${c.speciesId} has no species`)
      return {
        speciesId: target?.id ?? c.speciesId,
        name: target?.name ?? c.name,
        weight: c.weight,
      }
    })
  }

  const wildMetabolism = runner.wildEffect.find((m) => m.attr.includes('Metabolism'))?.value
  const wildScale = runner.wildEffect.find((m) => m.attr.includes('ScaleGrowth'))?.value
  if (wildMetabolism === undefined) gaps.push('wild metabolism modifier not found')

  const { stable, rancher, metabolismBase } = readConstants(opts.decompDir, gaps)

  species.sort((a, b) => a.familyName.localeCompare(b.familyName) || a.name.localeCompare(b.name))
  return {
    data: {
      stable,
      rancher,
      wild: {
        metabolismModifier: wildMetabolism ?? 0,
        metabolismBase,
        scaleGrowthMultiplier: wildScale ?? 0,
      },
      species,
      gaps,
    },
    diagnostics: runner.errors,
  }
}

export type { Interp }
