import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SkillTuning } from '../../src/skill-tree.ts'

function number(text: string, pattern: RegExp, what: string): number {
  const m = pattern.exec(text)
  if (!m) throw new Error(`${what} not found`)
  return Number(m[1])
}

/** Reads the experience and morale numbers from TUNING and MinionResume. */
export function readTuning(root: string): SkillTuning {
  const read = (file: string) => readFileSync(join(root, file), 'utf8')
  const skills = read('TUNING/SKILLS.cs')
  const constant = (name: string) => number(skills, new RegExp(`${name} = (-?[\\d.]+)f?;`), name)
  const costs = /SKILL_TIER_MORALE_COST = new int\[\] \{([^}]*)\}/.exec(skills)
  if (!costs) throw new Error('SKILL_TIER_MORALE_COST not found')
  const resume = read('MinionResume.cs')
  // Every curve function in MinionResume multiplies by the same literal seconds per cycle.
  const seconds = [...resume.matchAll(/TARGET_SKILLS_CYCLE( \/ | \* )?[^;]*?(\d+)f/g)]
  const perCycle = new Set(seconds.map((m) => m[2]))
  if (perCycle.size !== 1) throw new Error('Seconds per cycle not unique in MinionResume.cs')
  return {
    targetSkillsEarned: constant('TARGET_SKILLS_EARNED'),
    targetSkillsCycle: constant('TARGET_SKILLS_CYCLE'),
    experienceLevelPower: constant('EXPERIENCE_LEVEL_POWER'),
    secondsPerCycle: Number([...perCycle][0]),
    moraleCostByTier: costs[1]!.split(',').map((x) => Number(x.trim())),
    baselineMorale: number(
      read('BaseMinionConfig.cs'),
      /Attributes\.QualityOfLife\.Id, (\d+)f/,
      'Base morale',
    ),
    interestMorale: number(
      read('TUNING/DUPLICANTSTATS.cs'),
      /APTITUDE_BONUS = (\d+);/,
      'APTITUDE_BONUS',
    ),
  }
}
