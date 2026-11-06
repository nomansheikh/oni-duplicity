import { findElementByHash } from '@oni-duplicity/game-data'
import type { SaveGame } from '@oni-duplicity/save-parser'
import { isMarkedForMove, markedForMoveIds } from '../debris.ts'
import { allMaterialItems, materialItems } from '../material-items.ts'
import { instanceId, primary } from '../save-helpers.ts'
import type { MaterialItemView, MaterialView } from '../view-types.ts'

export function listMaterials(save: SaveGame): MaterialView[] {
  const totals = new Map<string, MaterialView & { heat: number }>()
  for (const item of allMaterialItems(save)) {
    const pe = primary(item.obj)
    const element = findElementByHash(Number(pe.ElementID))
    if (!element) continue
    const mass = Number(pe.Units) || 0
    const entry = totals.get(element.id) ?? {
      id: element.id,
      name: element.name,
      state: element.state,
      looseMass: 0,
      storedMass: 0,
      looseCount: 0,
      storedCount: 0,
      temperature: 0,
      heat: 0,
    }
    if (item.loose) {
      entry.looseMass += mass
      entry.looseCount++
    } else {
      entry.storedMass += mass
      entry.storedCount++
    }
    entry.heat += mass * (Number(pe._Temperature) || 0)
    totals.set(element.id, entry)
  }
  return [...totals.values()]
    .map(({ heat, ...m }) => ({
      ...m,
      temperature: heat / Math.max(m.looseMass + m.storedMass, 1e-9),
    }))
    .sort((a, b) => b.looseMass + b.storedMass - (a.looseMass + a.storedMass))
}

export function listMaterialItems(save: SaveGame, elementId: string): MaterialItemView[] {
  const moving = markedForMoveIds(save)
  return materialItems(save, elementId).map((item) => {
    const pe = primary(item.obj)
    const position = item.loose ? item.obj.position : item.owner.position
    return {
      ref: item.ref,
      where: item.where,
      loose: item.loose,
      x: Math.round(position.x),
      y: Math.round(position.y),
      mass: Number(pe.Units) || 0,
      temperature: Number(pe._Temperature) || 0,
      protected: item.loose && isMarkedForMove(item.obj, moving),
      instanceId: item.loose ? (instanceId(item.obj) ?? null) : null,
    }
  })
}
