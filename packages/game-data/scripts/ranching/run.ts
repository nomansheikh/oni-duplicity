/**
 * Runs the decompiled species configs through the C# interpreter and records what the game's
 * entity templates are told: traits, diets, egg and fertility parameters, space, drops.
 * Turning those raw captures into the shipped JSON happens in `extract-ranching.ts`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Env, Interp, Ref, ClassRef, type Obj, type Value } from '../csharp/interp.ts'
import { SourceIndex, type ClassInfo } from '../csharp/source.ts'

export interface DlcIds {
  required: string[]
  forbidden: string[]
}

export interface RawDiet {
  consumed: string[]
  produced: string
  caloriesPerKg: number
  conversion: number
  disease?: string
  diseasePerKg: number
  solidTile: boolean
  foodType: string
  dlc: DlcIds
}

export interface RawModifier {
  attr: string
  value: number
  multiplier: boolean
}

export interface RawSeed {
  id: string
  name?: string
  plant: Obj
  productionType?: string
  dlc: DlcIds
}

export interface RawElement {
  id: string
  state: string
  materialCategory: string
  tags: string[]
  disabled: boolean
  refinedMetalTarget?: string
}

/** What one species run observed. */
export interface Capture {
  traits: RawModifier[]
  diet: RawDiet[]
  fertile?: Record<string, Value>
  space?: number
  deaths: { id: string; count: number }[]
  defs: Obj[]
  nameRef?: string
  tags: string[]
  ranchable: boolean
}

export interface Runner {
  interp: Interp
  idx: SourceIndex
  seeds: RawSeed[]
  errors: Map<string, number>
  run(config: ClassInfo): { capture: Capture; dlc: DlcIds; id: string | undefined }
  dlcOf(cls: ClassInfo | undefined): DlcIds
  wildEffect: RawModifier[]
  foodDlc: Map<string, DlcIds>
  /** String key of the display name a config passes when it creates the entity with this id. */
  nameRefOf(id: string): string | undefined
}

const RUN = Symbol('run')

const stub = (type: string, extra: Record<string, unknown> = {}): Obj => ({ $type: type, ...extra })
const num = (v: Value, fallback = 0) => (typeof v === 'number' ? v : fallback)
const str = (v: Value) => (typeof v === 'string' ? v : v instanceof Ref ? v.path : '')

function readElements(dataDir: string): RawElement[] {
  const elements: RawElement[] = []
  for (const [file, state] of [
    ['solid', 'Solid'],
    ['liquid', 'Liquid'],
    ['gas', 'Gas'],
  ] as const) {
    const text = readFileSync(join(dataDir, `StreamingAssets/elements/${file}.yaml`), 'utf8')
    for (const block of text.split(/\n {2}- elementId: /).slice(1)) {
      const id = block.split(/[\s#]/)[0]!
      const field = (key: string) =>
        new RegExp(`\\n\\s+${key}:\\s*"?([^"\\n#]*)"?`).exec(block)?.[1]?.trim()
      const tags = /\n\s+tags:\n((?:\s+- .*\n?)*)/
        .exec(block)?.[1]
        ?.split('\n')
        .map((l) => l.replace(/^\s*-\s*/, '').trim())
        .filter(Boolean)
      elements.push({
        id,
        state,
        materialCategory: field('materialCategory') ?? '',
        tags: tags ?? [],
        disabled: field('isDisabled') === 'true',
        ...(field('refinedMetalTarget')
          ? { refinedMetalTarget: field('refinedMetalTarget')! }
          : {}),
      })
    }
  }
  return elements
}

export function createRunner(decompDir: string, gameDataDir: string): Runner {
  const idx = new SourceIndex(decompDir)
  const interp = new Interp(idx)
  const errors = new Map<string, number>()
  interp.onError = (where, error) => {
    const key = `${where} :: ${(error as Error).message}`
    errors.set(key, (errors.get(key) ?? 0) + 1)
  }
  const elements = readElements(gameDataDir)
  const elementObjects = elements.map((e) =>
    stub('Element', {
      id: e.id,
      tag: e.id,
      IsSolid: e.state === 'Solid',
      materialCategory: e.materialCategory,
      tags: e.tags,
      disabled: e.disabled,
      refinedMetalTarget: e.refinedMetalTarget,
    }),
  )

  let cap: Capture = { traits: [], diet: [], deaths: [], defs: [], tags: [], ranchable: false }
  const seeds: RawSeed[] = []
  const wildEffect: RawModifier[] = []
  const plantsById = new Map<string, Obj>()

  const dlcOf = (cls: ClassInfo | undefined): DlcIds => {
    const out: DlcIds = { required: [], forbidden: [] }
    if (!cls) return out
    for (const [key, method] of [
      ['required', 'GetRequiredDlcIds'],
      ['forbidden', 'GetForbiddenDlcIds'],
    ] as const) {
      const m = cls.methods.get(method)?.[0]
      if (!m) continue
      const v = interp.invoke(m, [])
      if (Array.isArray(v)) out[key] = v.filter((x): x is string => typeof x === 'string')
    }
    return out
  }
  const dlcFromValue = (v: Value): DlcIds => {
    if (v && typeof v === 'object' && '$class' in v && (v as Obj).$class)
      return dlcOf((v as Obj).$class)
    return { required: [], forbidden: [] }
  }

  // -- engine classes whose bodies are never run ---------------------------------------------
  interp.inertClasses.add('EntityTemplates')
  interp.inertClasses.add('Db')
  interp.runBodies.add('EntityTemplates.ExtendEntityToFertileCreature')
  interp.runBodies.add('EntityTemplates.ExtendEntityToWildCreature')
  interp.runBodies.add('EntityTemplates.ExtendEntityToBasicCreature')
  interp.runBodies.add('EntityTemplates.CreateAndRegisterSeedForPlant')

  const gameObject = (id: unknown) => stub('GameObject', { id, tags: [] as string[] })
  for (const name of [
    'CreatePlacedEntity',
    'CreateLooseEntity',
    'CreateBasicEntity',
    'CreateEntity',
  ]) {
    interp.intercepts.set(`EntityTemplates.${name}`, (b) => {
      const go = gameObject(b.id ?? Object.values(b)[0])
      if (cap.tags.length === 0 && typeof b.id === 'string') cap.tags = go.tags as string[]
      if (typeof b.id === 'string') plantsById.set(b.id, go)
      if (cap.nameRef === undefined && b.name instanceof Ref && b.name.path.startsWith('STRINGS.'))
        cap.nameRef = b.name.path
      return go
    })
  }

  interp.intercepts.set('EntityTemplates.ExtendEntityToFertileCreature', (b) => {
    if (!('eggShellRatio' in b) || !('eggChances' in b)) return RUN as unknown as Value
    cap.fertile = { ...b, dlc: dlcFromValue(b.dlcRestrictions) as unknown as Value }
    cap.ranchable = cap.ranchable || b.is_ranchable === true
    return b.prefab
  })
  interp.intercepts.set('EntityTemplates.ExtendEntityToWildCreature', (b) => {
    if (!('add_fixed_capturable_monitor' in b)) return RUN as unknown as Value
    cap.space = num(b.space_required_per_creature)
    return b.prefab
  })
  interp.intercepts.set('EntityTemplates.ExtendEntityToBasicCreature', (b) => {
    if ('onDeathDropID' in b && 'anim_filename' in b) {
      if (typeof b.onDeathDropID === 'string' && b.onDeathDropID !== '') {
        cap.deaths.push({ id: b.onDeathDropID, count: num(b.onDeathDropCount) })
      }
      return b.template
    }
    if ('data' in b) {
      const d = b.data as Obj | undefined
      const ids = d?.onDeathDropsID
      const counts = d?.onDeathDropsCount
      if (Array.isArray(ids)) {
        ids.forEach((id, i) => {
          if (typeof id === 'string')
            cap.deaths.push({ id, count: num((counts as Value[] | undefined)?.[i]) })
        })
      }
      return b.template
    }
    return RUN as unknown as Value
  })
  interp.intercepts.set('EntityTemplates.CreateAndRegisterSeedForPlantAsFood', (b) => {
    const plant = b.plant as Obj
    const seed: RawSeed = {
      id: str(b.id),
      ...(b.name !== undefined ? { name: str(b.name) } : {}),
      plant,
      ...(typeof b.productionType === 'string' ? { productionType: b.productionType } : {}),
      dlc: dlcFromValue(b.dlcRestrictions),
    }
    seeds.push(seed)
    return gameObject(b.id)
  })
  interp.intercepts.set(
    'EntityTemplates.CreateAndRegisterSeedForPlant',
    () => RUN as unknown as Value,
  )

  // -- Db / traits / modifiers -----------------------------------------------------------------
  interp.natives.set('Db.Get', () => new Ref('Db.Get()'))
  interp.natives.set('Ref:Db.Get().CreateTrait', () => stub('Trait'))
  interp.natives.set('Trait.Add', (args, { recv }) => {
    const m = args[0] as Obj | undefined
    if (m?.$type === 'AttributeModifier') cap.traits.push(m as unknown as RawModifier)
    return recv
  })
  interp.constructors.set('AttributeModifier', (args) => ({
    $type: 'AttributeModifier',
    attr: str(args[0]),
    value: num(args[1]),
    multiplier: args[3] === true,
  }))

  // -- diets ---------------------------------------------------------------------------------
  interp.constructors.set('Diet.Info', (args) => {
    if (args.length === 1 && args[0] && typeof args[0] === 'object') return { ...(args[0] as Obj) }
    const dlc = interp.currentDlc()
    const consumed = (args[0] as Value[] | undefined) ?? []
    return {
      $type: 'Diet.Info',
      consumed: consumed.map(str),
      produced: str(args[1]),
      caloriesPerKg: num(args[2]),
      conversion: args[3] === undefined ? 1 : num(args[3]),
      ...(typeof args[4] === 'string' && args[4] !== '' ? { disease: args[4] } : {}),
      diseasePerKg: num(args[5]),
      solidTile: args[6] === true,
      foodType: typeof args[7] === 'string' ? args[7] : 'EatSolid',
      dlc,
    }
  })
  interp.constructors.set('Info', interp.constructors.get('Diet.Info')!)
  interp.constructors.set('Diet', (args) => {
    const infos = args
      .flatMap((a) => (Array.isArray(a) ? a : [a]))
      .filter((x): x is Obj => !!x && typeof x === 'object')
    cap.diet = infos.filter((x) => x.$type === 'Diet.Info') as unknown as RawDiet[]
    return { $type: 'Diet', infos }
  })
  // BaseMooConfig.ExpandDiet loops over arrays, which the interpreter does not run: it appends
  // one Diet.Info built from its arguments to the diet it was given.
  interp.natives.set('BaseMooConfig.ExpandDiet', (args) => {
    const diet = args[0] as Obj | undefined
    const info = interp.constructors.get('Diet.Info')!(
      [[args[2]], args[3], args[4], args[5], undefined, 0, false, args[6]],
      {},
    ) as Obj
    const infos = [...(((diet?.infos as Obj[] | undefined) ?? []) as Obj[]), info]
    cap.diet = infos as unknown as RawDiet[]
    return { $type: 'Diet', infos }
  })

  interp.natives.set('TagManager.Create', (args) =>
    typeof args[0] === 'string' ? args[0] : (args[0] as Value),
  )

  // -- game object stubs -----------------------------------------------------------------------
  interp.natives.set('GameObject.AddTag', (args, { recv }) => {
    const o = recv as Obj
    if (typeof args[0] === 'string') (o.tags as string[]).push(args[0])
    return recv
  })
  interp.natives.set(
    'GameObject.HasTag',
    (args, { recv }) =>
      (recv as Obj).tags instanceof Array &&
      (recv as Obj & { tags: string[] }).tags.includes(str(args[0])),
  )
  const defNative = (args: Value[], { recv, generic }: { recv?: Value; generic?: string }) => {
    const def = stub(generic ?? 'Def')
    cap.defs.push(def)
    if (generic === 'RanchableMonitor.Def') cap.ranchable = true
    void args
    void recv
    return def
  }
  interp.natives.set('GameObject.AddOrGetDef', defNative)
  interp.natives.set('GameObject.AddOrGet', (_a, { recv }) => recv)
  interp.natives.set('GameObject.GetComponent', (_a, { recv, generic }) => {
    const o = recv as Obj
    if (generic === 'SeedProducer') {
      return o.seedProductionType === undefined
        ? null
        : stub('SeedProducer', { seedInfo: { productionType: o.seedProductionType } })
    }
    return recv
  })
  interp.natives.set('GameObject.PrefabID', (_a, { recv }) => (recv as Obj).id as Value)

  // -- element and food and seed queries -------------------------------------------------------
  interp.overrides.set('ElementLoader.elements', elementObjects as unknown as Value)
  interp.natives.set('ElementLoader.FindElementByTag', (args) =>
    elementObjects.find((e) => e.id === args[0]),
  )
  interp.natives.set('Element.HasTag', (args, { recv }) =>
    ((recv as Obj).tags as string[]).includes(str(args[0])),
  )
  interp.natives.set('EdiblesManager.GetAllLoadedFoodTypes', () => {
    const foods: Value[] = []
    for (const food of idx.find('FOOD', 'TUNING')) {
      const types = food.nested.get('FOOD_TYPES')
      for (const name of types?.fields.keys() ?? []) {
        const v = interp.fieldValue(types!, name)
        if (v && typeof v === 'object' && !Array.isArray(v)) foods.push(v)
      }
    }
    return foods
  })
  interp.natives.set('Assets.GetPrefabsWithComponent', () =>
    seeds.map((s) =>
      stub('Seed', {
        id: s.id,
        tags: [s.id],
        PlantID: s.plant.id,
        seedProductionType: s.productionType,
      }),
    ),
  )
  interp.natives.set('Assets.GetPrefab', (args) => plantsById.get(str(args[0])) ?? null)
  interp.natives.set('Seed.GetComponent', (_a, { recv }) => recv)
  interp.natives.set('Seed.PrefabID', (_a, { recv }) => (recv as Obj).id as Value)
  interp.natives.set('Seed.HasTag', (args, { recv }) =>
    ((recv as Obj).tags as string[]).includes(str(args[0])),
  )

  // -- DLC checks used as plain expressions ------------------------------------------------------
  for (const name of [
    'IsExpansion1Active',
    'IsContentSubscribed',
    'IsContentActive',
    'IsAllContentSubscribed',
  ]) {
    interp.natives.set(`DlcManager.${name}`, () => true)
  }

  // Seeds: run every plant config once so `CreateAndRegisterSeedForPlant` is observed.
  const plantConfigs: ClassInfo[] = []
  for (const list of idx.byName.values()) {
    for (const cls of list) {
      if (
        cls.methods.get('CreatePrefab')?.some((m) => /CreateAndRegisterSeedForPlant/.test(m.body))
      )
        plantConfigs.push(cls)
    }
  }
  for (const cls of new Set(plantConfigs)) runCreatePrefab(cls)

  function runCreatePrefab(cls: ClassInfo): Value {
    const m = cls.methods.get('CreatePrefab')?.[0]
    if (!m) return undefined
    const self: Obj = { $type: cls.name, $class: cls }
    return interp.invoke(m, [], self)
  }

  // Seeds record their plant after it was created; copy production type and DLC from the config.
  for (const seed of seeds) void seed

  // The wild effect: modifiers added to `wildEffect` inside ExtendEntityToWildCreature.
  const wild = idx
    .find('EntityTemplates')[0]
    ?.methods.get('ExtendEntityToWildCreature')
    ?.find((m) => /wildEffect/.test(m.body))
  if (wild) {
    for (const m of wild.body.matchAll(/wildEffect\.Add\(new AttributeModifier\(([^;]*?)\)\);/g)) {
      const parts = splitArgs(m[1]!)
      const env = new Env(undefined, wild.owner)
      const attr = interp.evalSource(parts[0]!, env)
      const value = interp.evalSource(parts[1]!, env)
      const multiplier = interp.evalSource(parts[3] ?? 'false', env)
      wildEffect.push({ attr: str(attr), value: num(value), multiplier: multiplier === true })
    }
  }

  const foodDlc = new Map<string, DlcIds>()
  for (const food of idx.find('FOOD', 'TUNING')) {
    const types = food.nested.get('FOOD_TYPES')
    for (const name of types?.fields.keys() ?? []) {
      const v = interp.fieldValue(types!, name)
      if (!v || typeof v !== 'object' || Array.isArray(v) || typeof (v as Obj).Id !== 'string')
        continue
      const o = v as Obj
      const list = (x: unknown) =>
        Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string') : []
      foodDlc.set(o.Id as string, {
        required: list(o.requiredDlcIds),
        forbidden: list(o.forbiddenDlcIds),
      })
    }
  }

  let idClasses: Map<string, ClassInfo> | undefined
  const nameRefOf = (id: string): string | undefined => {
    if (!idClasses) {
      idClasses = new Map()
      for (const list of idx.byName.values()) {
        for (const cls of list) {
          if (
            !/Config$/.test(cls.name) ||
            !cls.fields.has('ID') ||
            !cls.methods.has('CreatePrefab')
          )
            continue
          const v = interp.fieldValue(cls, 'ID')
          if (typeof v === 'string' && !idClasses.has(v)) idClasses.set(v, cls)
        }
      }
    }
    const cls = idClasses.get(id)
    if (!cls) return undefined
    const saved = cap
    cap = { traits: [], diet: [], deaths: [], defs: [], tags: [], ranchable: false }
    try {
      runCreatePrefab(cls)
      return cap.nameRef
    } finally {
      cap = saved
    }
  }

  return {
    interp,
    idx,
    foodDlc,
    nameRefOf,
    seeds,
    errors,
    wildEffect,
    dlcOf,
    run(config) {
      cap = { traits: [], diet: [], deaths: [], defs: [], tags: [], ranchable: false }
      runCreatePrefab(config)
      const id = interp.fieldValue(config, 'ID')
      return { capture: cap, dlc: dlcOf(config), id: typeof id === 'string' ? id : undefined }
    },
  }
}

function splitArgs(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!
    if (c === '(' || c === '[' || c === '{') depth += 1
    else if (c === ')' || c === ']' || c === '}') depth -= 1
    else if (c === ',' && depth === 0) {
      out.push(text.slice(start, i).trim())
      start = i + 1
    }
  }
  out.push(text.slice(start).trim())
  return out
}

export { ClassRef }
