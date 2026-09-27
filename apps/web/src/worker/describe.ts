import {
  findAmount,
  findAttribute,
  findCritter,
  findEffect,
  findElement,
  findGameSetting,
  findGeyser,
  findSkillGroupByHash,
  findTech,
  findTrait,
  humanize,
} from '@oni-duplicity/game-data'
import type { SaveGame } from '@oni-duplicity/save-parser'
import { objectById, type Edit, type GeyserField } from './model.ts'

const GEYSER_FIELDS: Record<GeyserField, string> = {
  scaledRate: 'output per active cycle',
  scaledIterationLength: 'eruption cycle',
  scaledIterationPercent: 'erupting share',
  scaledYearLength: 'activity cycle',
  scaledYearPercent: 'active share',
}

const BULK: Record<string, string> = {
  relieveStress: 'relieve stress',
  fillNeeds: 'heal and fill needs',
  masterSkills: 'master every skill',
}

const round = (n: number) => Number(n.toFixed(2)).toLocaleString()

/** What an object is called in the UI: its given name, else its type. */
function nameOf(save: SaveGame, id: string): string {
  try {
    const obj = objectById(save, id)
    for (const b of obj.behaviors) {
      if (b.name === 'MinionIdentity' && typeof b.templateData?.name === 'string') {
        return b.templateData.name
      }
      if (b.name === 'UserNameable' && typeof b.templateData?.savedName === 'string') {
        if (b.templateData.savedName) return b.templateData.savedName
      }
    }
  } catch {
    // Deleted since; fall back to the prefab.
  }
  const prefab = id.slice(0, id.lastIndexOf(':'))
  return findCritter(prefab)?.name ?? findGeyser(prefab)?.name ?? humanize(prefab)
}

/** A short, human line for the unsaved-changes list. Call it before applying the edit. */
export function describeEdit(save: SaveGame, edit: Edit): string {
  const who = 'id' in edit ? `${nameOf(save, edit.id)}: ` : ''
  switch (edit.type) {
    case 'setColonyName':
      return `Rename the colony to “${edit.name}”`
    case 'setSandbox':
      return `Turn sandbox mode ${edit.enabled ? 'on' : 'off'}`
    case 'setDebugWasUsed':
      return edit.used ? 'Mark debug mode as used' : 'Clear the debug mode flag'
    case 'setDuplicantName':
    case 'setGeyserName':
    case 'setAsteroidName':
      return `${who}rename to “${edit.name}”`
    case 'setGender':
      return `${who}gender ${edit.gender.toLowerCase()}`
    case 'addTrait':
      return `${who}add ${findTrait(edit.traitId)?.name ?? edit.traitId}`
    case 'removeTrait':
      return `${who}remove ${findTrait(edit.traitId)?.name ?? edit.traitId}`
    case 'setInterest': {
      const group = findSkillGroupByHash(edit.hash)?.name ?? `interest ${edit.hash}`
      return `${who}${edit.active ? 'add' : 'remove'} ${group} interest`
    }
    case 'setAttributeLevel':
      return `${who}${findAttribute(edit.attributeId)?.name ?? edit.attributeId} to ${edit.level}`
    case 'setSkillMastered':
      return `${who}${edit.mastered ? 'master' : 'forget'} ${humanize(edit.skillId)}`
    case 'setExperience':
      return `${who}experience to ${round(edit.experience)}`
    case 'setAmount':
      return `${who}${findAmount(edit.amountId)?.name ?? edit.amountId} to ${round(edit.value)}`
    case 'addEffect':
      return `${who}add ${findEffect(edit.effectId)?.name ?? edit.effectId}`
    case 'setEffectCycles':
      return `${who}${findEffect(edit.effectId)?.name ?? edit.effectId} for ${round(edit.cycles)} cycles`
    case 'removeEffect':
      return `${who}remove ${findEffect(edit.effectId)?.name ?? edit.effectId}`
    case 'setAccessory':
      return `${who}${edit.slot} ${edit.number}`
    case 'applyProfile':
      return `${who}paste ${edit.sections.join(', ')} from ${edit.profile.name}`
    case 'bulkDuplicants':
      return edit.action === 'setAttributes'
        ? `Everyone: every attribute to ${edit.level}`
        : `Everyone: ${BULK[edit.action]}`
    case 'setGeyserValue':
      return `${who}${GEYSER_FIELDS[edit.field]} to ${round(edit.value)}`
    case 'setItemMass':
      return `Set an item's mass to ${round(edit.mass)} kg`
    case 'setItemTemperature':
      return `Set an item's temperature to ${round(edit.kelvin - 273.15)} °C`
    case 'deleteObject':
      return `${who}delete`
    case 'cloneObject':
      return `${who}clone`
    case 'setTechResearched':
      return `${edit.complete ? 'Research' : 'Unresearch'} ${findTech(edit.techId)?.name ?? edit.techId}`
    case 'researchAll':
      return 'Research everything'
    case 'setGameSetting':
      return `${findGameSetting(edit.settingId)?.name ?? edit.settingId} to ${humanize(edit.level)}`
    case 'setWorldDiscovered':
      return `${who}mark ${edit.discovered ? 'discovered' : 'undiscovered'}`
    case 'rawSet':
      return `Raw: set ${edit.path.join('.')} to ${String(edit.value)}`
    case 'rawRemove':
      return `Raw: remove ${edit.path.join('.')}`
    case 'rawDuplicate':
      return `Raw: duplicate ${edit.path.join('.')}`
    case 'setMaterialTemperature':
      return `${findElement(edit.elementId)?.name ?? edit.elementId}: every temperature to ${round(edit.kelvin - 273.15)} °C`
    case 'scaleMaterialMass':
      return `${findElement(edit.elementId)?.name ?? edit.elementId}: every mass × ${round(edit.factor)}`
  }
}
