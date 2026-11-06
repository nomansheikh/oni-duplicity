import { Env } from '../csharp/interp.ts'
import type { Obj } from '../csharp/interp.ts'
import type { Ctx, DlcIds, RawModifier } from './types.ts'
import { num, splitArgs, str } from './util.ts'

/** The wild effect: modifiers added to `wildEffect` inside ExtendEntityToWildCreature. */
export function readWildEffect(ctx: Ctx): RawModifier[] {
  const { interp, idx } = ctx
  const wildEffect: RawModifier[] = []
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
  return wildEffect
}

export function readFoodDlc(ctx: Ctx): Map<string, DlcIds> {
  const { interp, idx } = ctx
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
  return foodDlc
}
