import type { SaveGame } from '@oni-duplicity/save-parser'
import type { Edit } from '../edit-types.ts'
import { rawDefaultItem } from '../raw.ts'
import { coerce, rawGet, rawParent } from '../raw-tree.ts'
import { cloneValue } from '../structure.ts'

export function applyRawEdit(
  save: SaveGame,
  edit: Extract<Edit, { type: 'rawSet' | 'rawRemove' | 'rawDuplicate' | 'rawAdd' }>,
): void {
  switch (edit.type) {
    case 'rawSet': {
      const { parent, key } = rawParent(save, edit.path)
      const current = parent[key as never] as unknown
      parent[key as never] = coerce(current, edit.value) as never
      return
    }
    case 'rawRemove': {
      const { parent, key } = rawParent(save, edit.path)
      if (!Array.isArray(parent)) throw new Error('Only array items can be removed')
      parent.splice(Number(key), 1)
      return
    }
    case 'rawDuplicate': {
      const { parent, key } = rawParent(save, edit.path)
      if (!Array.isArray(parent)) throw new Error('Only array items can be duplicated')
      parent.splice(Number(key) + 1, 0, cloneValue(parent[Number(key)]))
      return
    }
    case 'rawAdd': {
      const item = rawDefaultItem(save, edit.path)
      if (!item) throw new Error('Items cannot be added to this array')
      ;(rawGet(save, edit.path) as unknown[]).push(item.value)
      return
    }
  }
}
