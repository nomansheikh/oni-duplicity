import type { DuplicantModel, TraitCategory, TraitInfo } from './trait-types.ts'

export const E1 = 'EXPANSION1_ID'
export const DLC2 = 'DLC2_ID'
export const DLC3 = 'DLC3_ID'
export const DLC5 = 'DLC5_ID'

export const STANDARD: DuplicantModel[] = ['Minion']
export const BIONIC: DuplicantModel[] = ['BionicMinion']
export const BOTH: DuplicantModel[] = ['Minion', 'BionicMinion']

export interface Options {
  rarity?: number
  dlc?: string
  traits?: string[]
  interests?: string[]
  models?: DuplicantModel[]
  notGenerated?: boolean
}

export function list(
  category: TraitCategory,
  defaultModels: DuplicantModel[],
  entries: [id: string, options?: Options][],
): TraitInfo[] {
  return entries.map(([id, o = {}]) => ({
    id,
    category,
    ...(o.rarity ? { rarity: o.rarity } : {}),
    requiredDlcIds: o.dlc ? [o.dlc] : [],
    excludesTraits: o.traits ?? [],
    excludesInterests: o.interests ?? [],
    models: o.models ?? defaultModels,
    ...(o.notGenerated ? { notGenerated: true } : {}),
  }))
}

// Rarity constants of DUPLICANTSTATS: COMMON 1, UNCOMMON 2, RARE 3, EPIC 4, LEGENDARY 5.
