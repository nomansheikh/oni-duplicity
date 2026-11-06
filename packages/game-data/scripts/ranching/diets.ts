import type { Obj, Value } from '../csharp/interp.ts'
import { Ref } from '../csharp/interp.ts'
import type { Ctx, RawDiet, RawModifier } from './types.ts'
import { num, str, stub } from './util.ts'

/** Hooks for traits, attribute modifiers and diets. */
export function registerDiets(ctx: Ctx) {
  const { interp } = ctx
  // -- Db / traits / modifiers -----------------------------------------------------------------
  interp.natives.set('Db.Get', () => new Ref('Db.Get()'))
  interp.natives.set('Ref:Db.Get().CreateTrait', () => stub('Trait'))
  interp.natives.set('Trait.Add', (args, { recv }) => {
    const m = args[0] as Obj | undefined
    if (m?.$type === 'AttributeModifier') ctx.cap.traits.push(m as unknown as RawModifier)
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
    ctx.cap.diet = infos.filter((x) => x.$type === 'Diet.Info') as unknown as RawDiet[]
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
    ctx.cap.diet = infos as unknown as RawDiet[]
    return { $type: 'Diet', infos }
  })

  interp.natives.set('TagManager.Create', (args) =>
    typeof args[0] === 'string' ? args[0] : (args[0] as Value),
  )
}
