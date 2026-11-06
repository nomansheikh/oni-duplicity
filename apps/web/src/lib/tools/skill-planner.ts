/**
 * Pure maths for the skill planner. The tree comes from `skill-data.ts` and the numbers from
 * `skill-math.ts`, both read out of the game. Nothing here reads or writes a save.
 */
import type { Skill } from './skill-data'
import {
  baselineMorale,
  expectationForTiers,
  experienceForPoints,
  interestMorale,
  moraleCost,
  pointsForExperience,
} from './skill-math'

/**
 * Adds a skill to the plan together with every prerequisite that is neither mastered nor
 * planned, prerequisites first. Returns the plan unchanged if the skill is unknown.
 */
export function addToPlan(
  skillId: string,
  skills: Skill[],
  mastered: ReadonlySet<string>,
  plan: readonly string[],
): string[] {
  const byId = new Map(skills.map((s) => [s.id, s]))
  const next = [...plan]
  const seen = new Set<string>()
  const visit = (id: string) => {
    if (mastered.has(id) || next.includes(id) || seen.has(id)) return
    const skill = byId.get(id)
    if (!skill) return
    seen.add(id)
    skill.requires.forEach(visit)
    next.push(id)
  }
  visit(skillId)
  return next
}

/** Removes a planned skill and everything planned that depends on it. */
export function removeFromPlan(
  skillId: string,
  skills: Skill[],
  plan: readonly string[],
): string[] {
  const byId = new Map(skills.map((s) => [s.id, s]))
  const dropped = new Set([skillId])
  let grew = true
  while (grew) {
    grew = false
    for (const id of plan) {
      if (!dropped.has(id) && byId.get(id)?.requires.some((r) => dropped.has(r))) {
        dropped.add(id)
        grew = true
      }
    }
  }
  return plan.filter((id) => !dropped.has(id))
}

/** Drops plan entries that are now mastered or no longer exist, e.g. after loading another save. */
export function cleanPlan(
  plan: readonly string[],
  skills: Skill[],
  mastered: ReadonlySet<string>,
): string[] {
  const known = new Set(skills.map((s) => s.id))
  return plan.filter((id) => known.has(id) && !mastered.has(id))
}

export interface PlanStep {
  skill: Skill
  /** Skill points spent in total once this step is learned. */
  pointsAfter: number
  /** Morale expectation once this step is learned. */
  expectationAfter: number
  /** Learned skills of the duplicant's interests so far, which add morale. */
  interestSkillsAfter: number
  /** Experience the duplicant needs in total to have earned `pointsAfter` points. */
  experienceNeeded: number
}

export interface PlanSummary {
  steps: PlanStep[]
  masteredCount: number
  pointsAfter: number
  expectationBefore: number
  expectationAfter: number
  /** Morale the learned skills add by themselves: +1 per learned skill in an interest group. */
  interestMoraleBefore: number
  interestMoraleAfter: number
  /**
   * Morale that has to come from elsewhere (decor, food, rooms, ...) to meet the expectation:
   * expectation minus the base +1 and the interest morale. Never below 0.
   */
  moraleFromOtherSources: number
  /** Total experience to have earned every planned skill's point, and what is still missing. */
  experienceNeeded: number
  experienceMissing: number
  /** Skill points earned minus points spent, before the plan. */
  pointsAvailableNow: number
}

export function summarizePlan(input: {
  skills: Skill[]
  mastered: ReadonlySet<string>
  /** Interest group ids of the duplicant. */
  interests: ReadonlySet<string>
  plan: readonly string[]
  /** `totalExperienceGained` from the save. */
  experience: number
}): PlanSummary {
  const { skills, mastered, interests, plan, experience } = input
  const byId = new Map(skills.map((s) => [s.id, s]))
  const learned = skills.filter((s) => mastered.has(s.id))
  const interestCount = (list: Skill[]) => list.filter((s) => interests.has(s.group)).length
  const expectationBefore = expectationForTiers(learned.map((s) => s.tier))
  // Mastered skills the tree doesn't know still cost a point.
  const unknownMastered = [...mastered].filter((id) => !byId.has(id)).length
  const masteredCount = learned.length + unknownMastered

  const steps: PlanStep[] = []
  let points = masteredCount
  let expectation = expectationBefore
  let interestSkills = interestCount(learned)
  for (const id of plan) {
    const skill = byId.get(id)
    if (!skill) continue
    points += 1
    expectation += moraleCost(skill.tier)
    if (interests.has(skill.group)) interestSkills += 1
    steps.push({
      skill,
      pointsAfter: points,
      expectationAfter: expectation,
      interestSkillsAfter: interestSkills,
      experienceNeeded: experienceForPoints(points),
    })
  }
  const experienceNeeded = experienceForPoints(points)
  return {
    steps,
    masteredCount,
    pointsAfter: points,
    expectationBefore,
    expectationAfter: expectation,
    interestMoraleBefore: interestCount(learned) * interestMorale,
    interestMoraleAfter: interestSkills * interestMorale,
    moraleFromOtherSources: Math.max(
      0,
      expectation - baselineMorale - interestSkills * interestMorale,
    ),
    experienceNeeded,
    experienceMissing: Math.max(0, experienceNeeded - experience),
    pointsAvailableNow: pointsForExperience(experience) - masteredCount,
  }
}

/** Which state a node is in, for drawing the tree. */
export type NodeState = 'mastered' | 'planned' | 'available' | 'locked'

export function nodeState(
  skill: Skill,
  mastered: ReadonlySet<string>,
  plan: readonly string[],
): NodeState {
  if (mastered.has(skill.id)) return 'mastered'
  if (plan.includes(skill.id)) return 'planned'
  return skill.requires.every((r) => mastered.has(r)) ? 'available' : 'locked'
}

/**
 * Morale left over once the plan is learned. Current morale (read off the Vitals screen, the
 * save doesn't hold it) already includes the interest morale of what is mastered; each planned
 * skill then costs its morale expectation and adds 1 morale when it is in an interest group.
 */
export function moraleSurplus(summary: PlanSummary, currentMorale: number): number {
  return (
    currentMorale +
    (summary.interestMoraleAfter - summary.interestMoraleBefore) -
    summary.expectationAfter
  )
}
