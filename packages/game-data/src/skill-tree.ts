import data from './generated/game-data.json' with { type: 'json' }

/** A DlcManager check: the content pack must be active (or must not be). */
export interface SkillCond {
  dlc: string
  active: boolean
}

export interface SkillPerk {
  id: string
  /** What the skills screen shows for the perk. */
  text: string
  /** Attribute id and bonus, for perks that raise an attribute. */
  attribute?: string
  amount?: number
  /** Content packs the perk itself needs. */
  requiredDlcIds?: string[]
}

/** A perk a skill gives only under some content packs. */
export interface ConditionalPerk {
  perk: string
  when: SkillCond[]
}

/**
 * One `new Skill(...)` of Database/Skills.cs. A skill the game builds differently with and
 * without a content pack appears once per variant, each with the `when` it was built under.
 */
export interface SkillDef {
  id: string
  name: string
  description: string
  /** Index into `tuning.moraleCostByTier`. */
  tier: number
  group: string
  hat: string
  /** `Minion` or `BionicMinion`. */
  model: string
  prerequisites: string[]
  perks: string[]
  conditionalPerks: ConditionalPerk[]
  /** Content packs that must all be active for the skill to exist. */
  requiredDlcIds: string[]
  /** Conditions this variant was built under. */
  when: SkillCond[]
  /** The skill is flagged deprecated (cannot be learned) when any of these sets all hold. */
  deprecatedWhen: SkillCond[][]
}

export interface SkillTuning {
  /** Experience to earn n points: (n / targetSkillsEarned) ^ experienceLevelPower * targetSkillsCycle * secondsPerCycle. */
  targetSkillsEarned: number
  targetSkillsCycle: number
  experienceLevelPower: number
  secondsPerCycle: number
  /** Morale expectation a skill adds, indexed by its tier. */
  moraleCostByTier: number[]
  /** Morale every duplicant starts with. */
  baselineMorale: number
  /** Morale a learned skill adds when its group is one of the duplicant's interests. */
  interestMorale: number
}

export interface SkillGroupData {
  id: string
  name: string
  /** False for groups the game never rolls as a duplicant interest. */
  allowAsAptitude: boolean
}

export interface SkillTreeData {
  groups: SkillGroupData[]
  perks: SkillPerk[]
  skills: SkillDef[]
  tuning: SkillTuning
}

export const skillTree = data.skillTree as unknown as SkillTreeData
