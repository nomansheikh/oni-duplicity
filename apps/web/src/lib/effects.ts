import {
  findAttributeName,
  findEffectInfo,
  formatEffectModifier,
  type EffectGroup,
  type FormattedModifier,
} from '@oni-duplicity/game-data'

export const EFFECT_GROUP_ORDER: EffectGroup[] = ['good', 'bad', 'other']

export interface EffectDetail {
  group: EffectGroup
  /** Cycles the effect lasts when applied; 0 when it lasts until something removes it. */
  duration: number
  modifiers: FormattedModifier[]
}

/** Good or bad as the game flags it (`Effect.isBad`), its modifiers and its duration. */
export function effectDetail(id: string): EffectDetail {
  const info = findEffectInfo(id)
  if (!info) return { group: 'other', duration: 0, modifiers: [] }
  return {
    group: info.bad ? 'bad' : 'good',
    duration: info.duration,
    modifiers: info.modifiers.flatMap((m) => {
      const formatted = formatEffectModifier(m, findAttributeName(m.attribute))
      return formatted ? [formatted] : []
    }),
  }
}

/** Items split into the good, bad and other groups, in that order; empty groups are dropped. */
export function groupEffects<T extends { id: string }>(items: T[]) {
  return EFFECT_GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((i) => effectDetail(i.id).group === group),
  })).filter((g) => g.items.length > 0)
}
