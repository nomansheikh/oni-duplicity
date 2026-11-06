import type { Capture, DlcIds, RawDiet, createRunner } from './run.ts'
import type { RanchDietEntry } from '../../src/ranching.ts'
import type { Names } from './species-names.ts'

const FOOD_KINDS: Record<string, RanchDietEntry['kind']> = {
  EatSolid: 'solid',
  EatPlantDirectly: 'plant',
  EatPlantStorage: 'plantStorage',
  EatButcheredPrey: 'prey',
  EatPrey: 'prey',
}

/** Builds a species' diet. Seeds and plants carry their own DLC requirements; food items carry theirs in FoodInfo. */
export function createDietBuilder(
  runner: ReturnType<typeof createRunner>,
  stringAt: (key: string | undefined) => string | undefined,
  itemName: Names,
  gaps: string[],
) {
  const seedDlc = new Map<string, DlcIds>()
  const seedNames = new Map<string, string>()
  for (const s of runner.seeds) {
    seedDlc.set(s.id, s.dlc)
    const n = stringAt(s.name)
    if (n) seedNames.set(s.id, n)
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

  return (id: string, capture: Capture): RanchDietEntry[] => {
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
    return diet
  }
}
