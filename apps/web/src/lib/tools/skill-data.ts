/** Which skills a duplicant can learn in a save, from the skill tree read out of the game. */
import {
  skillTree,
  type SkillCond,
  type SkillDef,
  type SkillGroupData,
  type SkillPerk,
} from '@oni-duplicity/game-data'
import { moraleCost } from './skill-math'

export interface PlannerContext {
  /** `Minion` or `BionicMinion`. */
  model: string
  /** DLC ids active in the save. */
  dlcIds: string[]
}

export interface Skill extends SkillDef {
  /** Prerequisites that apply with this save's DLCs. */
  requires: string[]
  /** Perks it gives with this save's DLCs, with the text the game shows. */
  givenPerks: SkillPerk[]
  /** Morale expectation it adds once learned. */
  moraleCost: number
}

const holds = (when: SkillCond[], dlcs: ReadonlySet<string>) =>
  when.every((c) => dlcs.has(c.dlc) === c.active)

const perkById = new Map(skillTree.perks.map((p) => [p.id, p]))

function perksOf(def: SkillDef, dlcs: ReadonlySet<string>): SkillPerk[] {
  const ids = [
    ...def.perks,
    ...def.conditionalPerks.filter((c) => holds(c.when, dlcs)).map((c) => c.perk),
  ]
  return [...new Set(ids)]
    .map((id) => perkById.get(id)!)
    .filter((p) => (p.requiredDlcIds ?? []).every((d) => dlcs.has(d)))
}

/**
 * The skills a duplicant of this model can learn in this save, with the right prerequisites.
 * Skills the game flags deprecated in these DLCs cannot be learned and are left out.
 */
export function skillsFor(ctx: PlannerContext): Skill[] {
  const dlcs = new Set(ctx.dlcIds)
  return skillTree.skills
    .filter(
      (s) =>
        s.model === ctx.model &&
        holds(s.when, dlcs) &&
        s.requiredDlcIds.every((d) => dlcs.has(d)) &&
        !s.deprecatedWhen.some((w) => holds(w, dlcs)),
    )
    .map((s) => ({
      ...s,
      requires: s.prerequisites,
      givenPerks: perksOf(s, dlcs),
      moraleCost: moraleCost(s.tier),
    }))
}

/** Skill groups in the order the game defines them. */
export const skillGroups: SkillGroupData[] = skillTree.groups
