import type { Value } from '../csharp/interp.ts'
import type { Capture } from './run.ts'
import type { RanchProductEntry } from '../../src/ranching.ts'
import { num, text, type Names } from './species-names.ts'

export function buildProducts(capture: Capture, itemName: Names): RanchProductEntry[] {
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
  return products
}
