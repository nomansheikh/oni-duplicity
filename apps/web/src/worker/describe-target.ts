import { findCritter, findGeyser } from '@oni-duplicity/game-data'
import type { ChangeTarget } from '../lib/changes.ts'
import type { Edit } from './model.ts'

const DUPLICANT_PREFABS = new Set(['Minion', 'BionicMinion'])

/** The category an object id (`<prefab>:<index>`) belongs to, from its prefab alone. */
function targetOfObject(id: string): ChangeTarget {
  const prefab = id.slice(0, id.lastIndexOf(':'))
  if (DUPLICANT_PREFABS.has(prefab)) return { category: 'duplicant', key: id }
  if (findGeyser(prefab)) return { category: 'geyser', key: id }
  if (findCritter(prefab)) return { category: 'critter', key: id }
  return { category: 'object', key: id }
}

/** The object an edit changes, for grouping the unsaved changes. Pure: it needs no save. */
export function editTarget(edit: Edit): ChangeTarget {
  switch (edit.type) {
    case 'setColonyName':
    case 'setSandbox':
    case 'setDebugWasUsed':
      return { category: 'colony', key: 'colony' }
    case 'setGameSetting':
      return { category: 'setting', key: edit.settingId }
    case 'bulkDuplicants':
      return { category: 'duplicant', key: '*' }
    case 'setGeyserName':
    case 'setGeyserValue':
      return { category: 'geyser', key: edit.id }
    case 'setAsteroidName':
    case 'setWorldDiscovered':
      return { category: 'asteroid', key: edit.id }
    case 'setItemMass':
    case 'setItemTemperature':
      return { category: 'item', key: edit.ref }
    case 'setTechResearched':
      return { category: 'research', key: edit.techId }
    case 'researchAll':
      return { category: 'research', key: '*' }
    case 'setMaterialTemperature':
    case 'scaleMaterialMass':
      return { category: 'material', key: edit.elementId }
    case 'rawSet':
    case 'rawRemove':
    case 'rawDuplicate':
    case 'rawAdd':
      return { category: 'raw', key: edit.path.join('.') }
    case 'setDemoliorImpact':
      return { category: 'colony', key: 'demolior' }
    case 'setDestinationMass':
    case 'setDestinationAnalysis':
      return { category: 'asteroid', key: `destination:${edit.destination}` }
    case 'revealStarmap':
      return { category: 'asteroid', key: 'starmap' }
    case 'setPoiStock':
      return targetOfObject(edit.id)
    case 'deleteDebris':
      return { category: 'item', key: `debris:${edit.ids.join(',')}` }
    case 'deleteObject':
    case 'cloneObject':
      return targetOfObject(edit.id)
    default:
      return targetOfObject(edit.id)
  }
}
