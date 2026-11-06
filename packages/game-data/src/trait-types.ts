export type TraitCategory =
  | 'positive'
  | 'negative'
  | 'congenital'
  | 'genetic'
  | 'bionic'
  | 'stress'
  | 'joy'
  | 'need'
  | 'special'

/** The prefab of a duplicant model, as `MinionIdentity.model.name` and the object group. */
export type DuplicantModel = 'Minion' | 'BionicMinion'

export interface TraitInfo {
  id: string
  category: TraitCategory
  /** 1 (common) to 5 (legendary); the game rolls traits by rarity. */
  rarity?: number
  /** DLC IDs that must be active for the save (empty: base game). */
  requiredDlcIds: string[]
  /** Trait IDs the game never combines with this one. */
  excludesTraits: string[]
  /** Skill group (interest) IDs this trait cannot be combined with. */
  excludesInterests: string[]
  /** Models that can carry the trait. */
  models: DuplicantModel[]
  /** `doNotGenerateTrait`: the game never rolls it for a new duplicant. */
  notGenerated?: boolean
}
