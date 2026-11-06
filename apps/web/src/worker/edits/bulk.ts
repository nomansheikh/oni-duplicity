import { MinionSkills } from '@oni-duplicity/game-data'
import type { SaveGame } from '@oni-duplicity/save-parser'
import { limitOf } from '../amount-limits.ts'
import type { Edit } from '../edit-types.ts'
import { behavior, dlcIds, modelNameOf, modifiers, objectsWith } from '../save-helpers.ts'
import { applyEdit } from './apply.ts'

/** Full values for a standard duplicant; bladder and stress are best empty. */
const FULL_NEEDS: Record<string, number> = {
  HitPoints: 100,
  Calories: 4_000_000,
  Stamina: 100,
  Breath: 100,
  Bladder: 0,
  Stress: 0,
}

export function applyBulk(save: SaveGame, edit: Extract<Edit, { type: 'bulkDuplicants' }>): void {
  const activeDlcs = new Set(dlcIds(save))
  for (const { id, prefab, obj } of objectsWith(save, 'MinionIdentity')) {
    const present = new Set(modifiers(obj)?.amounts.map((a) => a.name) ?? [])
    const setAmount = (amountId: string, value: number) =>
      present.has(amountId) && applyEdit(save, { type: 'setAmount', id, amountId, value })
    if (edit.action === 'relieveStress') setAmount('Stress', 0)
    if (edit.action === 'fillNeeds') {
      for (const [amountId, full] of Object.entries(FULL_NEEDS)) {
        // Fill to this duplicant's own maximum (breath is 500 or 600 with Minnow or Swimming),
        // and never lower a value that is already higher.
        const current = Number(
          (
            modifiers(obj)?.amounts.find((a) => a.name === amountId)?.value as
              | { value: number }
              | undefined
          )?.value,
        )
        const max = limitOf(obj, id, amountId)?.max ?? full
        setAmount(amountId, full === 0 ? 0 : Math.max(max, Number.isFinite(current) ? current : 0))
      }
    }
    if (edit.action === 'setAttributes') {
      const levels = (behavior(obj, 'Klei.AI.AttributeLevels')?.templateData?.saveLoadLevels ??
        []) as { attributeId: string }[]
      for (const { attributeId } of levels) {
        applyEdit(save, { type: 'setAttributeLevel', id, attributeId, level: edit.level })
      }
    }
    if (edit.action === 'masterSkills') {
      const model = modelNameOf(obj, prefab)
      for (const skill of MinionSkills) {
        if ((skill.model ?? 'Minion') !== model) continue
        if (!skill.requiredDlcIds.every((d) => activeDlcs.has(d))) continue
        applyEdit(save, { type: 'setSkillMastered', id, skillId: skill.id, mastered: true })
      }
    }
  }
}
