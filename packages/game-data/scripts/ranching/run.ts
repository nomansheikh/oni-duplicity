/**
 * Runs the decompiled species configs through the C# interpreter and records what the game's
 * entity templates are told: traits, diets, egg and fertility parameters, space, drops.
 * Turning those raw captures into the shipped JSON happens in `extract-ranching.ts`.
 */
import { Interp, ClassRef, type Obj, type Value } from '../csharp/interp.ts'
import { SourceIndex, type ClassInfo } from '../csharp/source.ts'
import { elementStubs, readElements } from './elements.ts'
import { registerDiets } from './diets.ts'
import { createNameRefOf } from './names.ts'
import { registerNatives } from './natives.ts'
import { registerTemplates } from './templates.ts'
import { newCapture, type Ctx, type DlcIds, type Runner } from './types.ts'
import { runCreatePrefab } from './util.ts'
import { readFoodDlc, readWildEffect } from './wild.ts'

export type { Capture, DlcIds, RawDiet, RawElement, RawModifier, RawSeed, Runner } from './types.ts'

export function createRunner(decompDir: string, gameDataDir: string): Runner {
  const idx = new SourceIndex(decompDir)
  const interp = new Interp(idx)
  const errors = new Map<string, number>()
  interp.onError = (where, error) => {
    const key = `${where} :: ${(error as Error).message}`
    errors.set(key, (errors.get(key) ?? 0) + 1)
  }
  const elementObjects = elementStubs(readElements(gameDataDir))

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
  const ctx: Ctx = {
    interp,
    idx,
    cap: newCapture(),
    seeds: [],
    plantsById: new Map<string, Obj>(),
    dlcOf,
    dlcFromValue,
  }

  registerTemplates(ctx)
  registerDiets(ctx)
  registerNatives(ctx, elementObjects)

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
  for (const cls of new Set(plantConfigs)) runCreatePrefab(ctx, cls)

  const wildEffect = readWildEffect(ctx)
  const foodDlc = readFoodDlc(ctx)

  return {
    interp,
    idx,
    foodDlc,
    nameRefOf: createNameRefOf(ctx),
    seeds: ctx.seeds,
    errors,
    wildEffect,
    dlcOf,
    run(config) {
      ctx.cap = newCapture()
      runCreatePrefab(ctx, config)
      const id = interp.fieldValue(config, 'ID')
      return { capture: ctx.cap, dlc: dlcOf(config), id: typeof id === 'string' ? id : undefined }
    },
  }
}

export { ClassRef }
