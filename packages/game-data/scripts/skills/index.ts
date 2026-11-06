/**
 * Skill tree extraction. Names and descriptions come from the game's strings; the tree, the
 * tiers, the perks and the tuning numbers are read from the decompiled C# (a checkout of
 * https://github.com/Kupie/ONI_Decomp). Found through `decompDir()` (.cache/ONI_Decomp or ONI_DECOMP).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SkillGroupData, SkillTreeData } from '../../src/skill-tree.ts'
import { decompDir } from '../extract/paths.ts'
import { readPerks } from './read-perks.ts'
import { readGroupIds, readSkills } from './read-skills.ts'
import { readTuning } from './read-tuning.ts'
import { lookup, plain } from './strip.ts'

/** Group names: the SKILLGROUPS string where the game has one, else the name given to the group. */
function readGroups(
  root: string,
  strings: Map<string, string>,
  ids: Map<string, string>,
): SkillGroupData[] {
  const source = readFileSync(join(root, 'Database/SkillGroups.cs'), 'utf8')
  return [...ids.entries()].map(([field, id]) => {
    const own = strings.get(`STRINGS.DUPLICANTS.SKILLGROUPS.${id.toUpperCase()}.NAME`)
    const arg = new RegExp(`new SkillGroup\\("${id}", [^,]+, ([^,]*),`).exec(source)![1]!.trim()
    const named = own ?? (arg === '""' ? '' : lookup(strings, `STRINGS.${arg}`))
    const aptitude = !new RegExp(`this\\.${field}\\.allowAsAptitude = false`).test(source)
    return { id, name: plain(named), allowAsAptitude: aptitude }
  })
}

export function readSkillTree(strings: Map<string, string>): { skillTree: SkillTreeData } {
  const root = join(decompDir(), 'Assembly-CSharp')
  const perks = readPerks(root, strings)
  const groupIds = readGroupIds(root)
  return {
    skillTree: {
      groups: readGroups(root, strings, groupIds),
      perks: [...perks.byField.values()],
      skills: readSkills(root, strings, perks, groupIds),
      tuning: readTuning(root),
    },
  }
}
