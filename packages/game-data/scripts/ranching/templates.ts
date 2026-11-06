import { Ref, type Obj, type Value } from '../csharp/interp.ts'
import type { Ctx, RawSeed } from './types.ts'
import { RUN, num, str, stub } from './util.ts'

/** Hooks for the EntityTemplates helpers every species config calls. */
export function registerTemplates(ctx: Ctx) {
  const { interp, seeds, plantsById, dlcFromValue } = ctx
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
      if (ctx.cap.tags.length === 0 && typeof b.id === 'string') ctx.cap.tags = go.tags as string[]
      if (typeof b.id === 'string') plantsById.set(b.id, go)
      if (
        ctx.cap.nameRef === undefined &&
        b.name instanceof Ref &&
        b.name.path.startsWith('STRINGS.')
      )
        ctx.cap.nameRef = b.name.path
      return go
    })
  }

  interp.intercepts.set('EntityTemplates.ExtendEntityToFertileCreature', (b) => {
    if (!('eggShellRatio' in b) || !('eggChances' in b)) return RUN as unknown as Value
    ctx.cap.fertile = { ...b, dlc: dlcFromValue(b.dlcRestrictions) as unknown as Value }
    ctx.cap.ranchable = ctx.cap.ranchable || b.is_ranchable === true
    return b.prefab
  })
  interp.intercepts.set('EntityTemplates.ExtendEntityToWildCreature', (b) => {
    if (!('add_fixed_capturable_monitor' in b)) return RUN as unknown as Value
    ctx.cap.space = num(b.space_required_per_creature)
    return b.prefab
  })
  interp.intercepts.set('EntityTemplates.ExtendEntityToBasicCreature', (b) => {
    if ('onDeathDropID' in b && 'anim_filename' in b) {
      if (typeof b.onDeathDropID === 'string' && b.onDeathDropID !== '') {
        ctx.cap.deaths.push({ id: b.onDeathDropID, count: num(b.onDeathDropCount) })
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
            ctx.cap.deaths.push({ id, count: num((counts as Value[] | undefined)?.[i]) })
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
}
