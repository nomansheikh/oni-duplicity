import type { Obj, Value } from '../csharp/interp.ts'
import type { Ctx } from './types.ts'
import { str, stub } from './util.ts'

/** Hooks for game objects, element, food and seed queries and DLC checks. */
export function registerNatives(ctx: Ctx, elementObjects: Obj[]) {
  const { interp, idx, seeds, plantsById } = ctx
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
    ctx.cap.defs.push(def)
    if (generic === 'RanchableMonitor.Def') ctx.cap.ranchable = true
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
}
