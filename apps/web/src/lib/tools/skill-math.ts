/**
 * The skill experience and morale formulas, with the numbers the game's own code uses
 * (read into `skillTree.tuning`). Nothing here reads or writes a save.
 */
import { skillTree } from '@oni-duplicity/game-data'

const T = skillTree.tuning

/** Mathf.Pow on floats is single precision; Math.fround keeps the same rounding steps. */
const f = Math.fround

/** Morale expectation of a set of learned skills (MinionResume.UpdateExpectations), by tier. */
export const expectationForTiers = (tiers: number[]): number =>
  tiers.reduce((sum, tier) => sum + moraleCost(tier), 0)

/** What a skill of this tier adds to the morale expectation (Skill.GetMoraleExpectation). */
export const moraleCost = (tier: number): number => T.moraleCostByTier[tier]!

/** Total experience at which a duplicant has earned `points` skill points. */
export const experienceForPoints = (points: number): number =>
  f(
    f(
      f(Math.pow(f(points / T.targetSkillsEarned), f(T.experienceLevelPower))) *
        T.targetSkillsCycle,
    ) * T.secondsPerCycle,
  )

/** Skill points earned for a total experience (MinionResume.CalculateTotalSkillPointsGained). */
export const pointsForExperience = (experience: number): number =>
  Math.floor(
    f(
      f(
        Math.pow(
          f(f(experience / T.targetSkillsCycle) / T.secondsPerCycle),
          f(1 / f(T.experienceLevelPower)),
        ),
      ) * T.targetSkillsEarned,
    ),
  )

export const baselineMorale = T.baselineMorale

/** Morale a learned skill adds when its group is one of the duplicant's interests. */
export const interestMorale = T.interestMorale
