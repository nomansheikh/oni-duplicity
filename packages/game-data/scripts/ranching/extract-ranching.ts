/**
 * Ranching data for every ranchable species and morph, read from the decompiled game
 * (https://github.com/Kupie/ONI_Decomp) by running each species config through a small C#
 * interpreter. Names come from the game's strings. Nothing here is typed in by hand: when a
 * value cannot be read it is left out and listed in `gaps`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Interp, Ref, type Obj, type Value } from '../csharp/interp.ts'
import type { ClassInfo } from '../csharp/source.ts'
import { createRunner, type Capture, type DlcIds, type RawDiet, type RawModifier } from './run.ts'

import type {
  RanchDietEntry,
  RanchProductEntry,
  RanchSpecies,
  RanchingData,
} from '../../src/ranching.ts'

export type { RanchDietEntry, RanchProductEntry, RanchSpecies, RanchingData }

type Names = (id: string) => string | undefined

const num = (v: Value, fallback = 0) => (typeof v === 'number' ? v : fallback)
const text = (v: Value) => (typeof v === 'string' ? v : v instanceof Ref ? v.path : '')

const trait = (traits: RawModifier[], path: string) =>
  traits.find((t) => t.attr.includes(path))?.value

const FOOD_KINDS: Record<string, RanchDietEntry['kind']> = {
  EatSolid: 'solid',
  EatPlantDirectly: 'plant',
  EatPlantStorage: 'plantStorage',
  EatButcheredPrey: 'prey',
  EatPrey: 'prey',
}

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

  const stringAt = (key: string | undefined) => {
    if (!key) return undefined
    const full = key.startsWith('STRINGS.') ? key : `STRINGS.${key}`
    const v = opts.strings.get(full)
    return v === undefined ? undefined : opts.clean(v)
  }

  // Suffix index: UPPERCASE id -> every `.NAME` string key ending in `.<ID>.NAME`.
  const nameKeys = new Map<string, string[]>()
  for (const key of opts.strings.keys()) {
    const m = /^STRINGS\.(.+)\.([A-Z0-9_]+)\.NAME$/.exec(key)
    if (!m) continue
    const list = nameKeys.get(m[2]!) ?? []
    list.push(key)
    nameKeys.set(m[2]!, list)
  }
  const CATEGORY_ORDER = [
    'ELEMENTS',
    'ITEMS.FOOD',
    'ITEMS.INDUSTRIAL_PRODUCTS',
    'CREATURES.SPECIES',
    'ITEMS',
  ]

  const species: RanchSpecies[] = []
  const speciesNameById = new Map<string, string>()
  const nameKeyBySpecies = new Map<string, string>()

  // Pass 1: run every config.
  const runs: { cls: ClassInfo; id: string; capture: Capture; dlc: DlcIds }[] = []
  for (const cls of speciesConfigs(runner.idx)) {
    const { capture, dlc, id } = runner.run(cls)
    const fertile = capture.fertile
    if (!id || !capture.ranchable) continue
    if (fertile && (fertile.deprecated === true || fertile.is_ranchable === false)) continue
    runs.push({ cls, id, capture, dlc })
    const eggName = text(fertile?.eggName as Value)
    const key = capture.nameRef ?? (eggName ? eggName.replace(/\.EGG_NAME$/, '.NAME') : undefined)
    if (key) nameKeyBySpecies.set(id, key)
    const n = stringAt(key)
    if (n) speciesNameById.set(id, n)
  }

  const itemName: Names = (id) => {
    if (id === '') return undefined
    const element = opts.elementName(id)
    if (element) return element
    const species = speciesNameById.get(id)
    if (species) return species
    const viaConfig = stringAt(runner.nameRefOf(id))
    if (viaConfig) return viaConfig
    const upper = id.toUpperCase()
    const keys = nameKeys.get(upper)
    if (keys) {
      const ranked = [...keys].sort((a, b) => rank(a) - rank(b) || a.length - b.length)
      return opts.clean(opts.strings.get(ranked[0]!)!)
    }
    // Babies: `<Species>Baby` -> the species' BABY name.
    if (id.endsWith('Baby')) {
      const key = nameKeyBySpecies.get(id.slice(0, -4))
      const baby = key ? stringAt(key.replace(/\.NAME$/, '.BABY.NAME')) : undefined
      if (baby) return baby
    }
    return undefined
  }
  function rank(key: string) {
    const body = key.replace(/^STRINGS\./, '')
    const i = CATEGORY_ORDER.findIndex((c) => body.startsWith(`${c}.`))
    return i < 0 ? 99 : i
  }

  // Seeds and plants carry their own DLC requirements; food items carry theirs in FoodInfo.
  const seedDlc = new Map<string, DlcIds>()
  const seedNames = new Map<string, string>()
  const seedAllowed = new Set<string>()
  for (const s of runner.seeds) {
    seedDlc.set(s.id, s.dlc)
    const n = stringAt(s.name)
    if (n) seedNames.set(s.id, n)
    seedAllowed.add(s.id)
  }
  const foodDlc = runner.foodDlc

  const dlcOfDiet = (d: RawDiet, id: string): DlcIds => {
    const merged: DlcIds = { required: [...d.dlc.required], forbidden: [...d.dlc.forbidden] }
    const extra = seedDlc.get(id) ?? foodDlc.get(id)
    if (extra) {
      merged.required.push(...extra.required)
      merged.forbidden.push(...extra.forbidden)
    }
    return {
      required: [...new Set(merged.required)],
      forbidden: [...new Set(merged.forbidden)],
    }
  }

  for (const { id, capture, dlc, cls } of runs) {
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

    const diet: RanchDietEntry[] = []
    for (const info of capture.diet) {
      const kind = FOOD_KINDS[info.foodType]
      if (!kind) {
        gaps.push(`${id}: unknown food type ${info.foodType}`)
        continue
      }
      for (const eaten of info.consumed) {
        const d = dlcOfDiet(info, eaten)
        const entry: RanchDietEntry = {
          id: eaten,
          name: seedNames.get(eaten) ?? itemName(eaten) ?? eaten,
          kind,
          calories: info.caloriesPerKg,
          ...(info.produced !== ''
            ? {
                produces: {
                  id: info.produced,
                  name: itemName(info.produced) ?? info.produced,
                  ratio: info.conversion,
                },
              }
            : {}),
          ...(info.disease ? { disease: info.disease } : {}),
          ...(d.required.length > 0 ? { dlcIds: d.required } : {}),
          ...(d.forbidden.length > 0 ? { forbiddenDlcIds: d.forbidden } : {}),
        }
        if (!seedNames.has(eaten) && itemName(eaten) === undefined && kind !== 'prey') {
          gaps.push(`${id}: no display name for food ${eaten}`)
        }
        diet.push(entry)
      }
    }

    const products: RanchProductEntry[] = []
    for (const def of capture.defs) {
      if (def.$type === 'ScaleGrowthMonitor.Def') {
        const item = text(def.itemDroppedOnShear as Value)
        const rate = num(def.defaultGrowthRate as Value)
        products.push({
          kind: 'shear',
          item,
          name: itemName(item) ?? item,
          kg: num(def.dropMass as Value),
          ...(rate > 0 ? { cycles: 1 / rate / 600 } : {}),
        })
      } else if (def.$type === 'MilkProductionMonitor.Def') {
        products.push({
          kind: 'milk',
          caloriesPerCycle: num(def.CaloriesPerCycle as Value),
          capacityKg: num(def.Capacity as Value),
        })
      }
    }

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
    void cls
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

  const source = (file: string) =>
    readFileSync(join(opts.decompDir, 'Assembly-CSharp', file), 'utf8')
  const found = (re: RegExp, text: string, what: string) => {
    const v = re.exec(text)?.[1]
    if (v === undefined) gaps.push(what)
    return v === undefined ? 0 : Number(v)
  }
  const metabolismBase = Number(
    /"Metabolism", false, [^,]+, false, ([\d.]+)f/.exec(
      source('Database/CritterAttributes.cs'),
    )?.[1],
  )
  if (!Number.isFinite(metabolismBase)) gaps.push('metabolism base value')
  const station = source('RanchStationConfig.cs')
  const rooms = source('Database/RoomTypes.cs')
  const pen = /this\.CreaturePen = base\.Add\([\s\S]*?\}, new RoomDetails/.exec(rooms)?.[0] ?? ''
  const constraints = source('RoomConstraints.cs')
  const minCells = found(/MINIMUM_SIZE_(\d+)/, pen, 'stable minimum size')
  const maxCells = found(/MAXIMUM_SIZE_(\d+)/, pen, 'stable maximum size')
  if (!new RegExp(`MINIMUM_SIZE_${minCells} = [^;]*NumCells >= ${minCells}`).test(constraints))
    gaps.push('stable minimum constraint mismatch')
  if (!new RegExp(`MAXIMUM_SIZE_${maxCells} = [^;]*NumCells <= ${maxCells}`).test(constraints))
    gaps.push('stable maximum constraint mismatch')
  const rancher = {
    workSeconds: found(/def\.WorkTime = ([\d.]+)f/, station, 'ranch work time'),
    ranchedEffectSeconds: found(
      /new Effect\("Ranched",[^;]*?, ([\d.]+)f, true, true, false/,
      source('ModifierSet.cs'),
      'ranched effect duration',
    ),
    durationPerRanchingPoint: found(/1f \+ num \* ([\d.]+)f/, station, 'ranching skill multiplier'),
  }

  species.sort((a, b) => a.familyName.localeCompare(b.familyName) || a.name.localeCompare(b.name))
  return {
    data: {
      stable: { minCells, maxCells },
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

function familyOf(nameKey: string | undefined): string | undefined {
  return /^STRINGS\.CREATURES\.SPECIES\.([A-Z0-9_]+)\./.exec(nameKey ?? '')?.[1]
}

export type { Interp }
