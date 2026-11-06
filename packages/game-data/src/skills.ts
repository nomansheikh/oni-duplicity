import { skillTree } from './skill-tree.ts'

export interface MinionSkill {
  id: string

  /** Content packs that must all be active. Empty means base game. */
  requiredDlcIds: string[]

  /**
   * The duplicant model this applies to, matching MinionIdentity.model.name.
   * Absent means the standard "Minion" model.
   */
  model?: string
}

/** Every skill the game defines, read from Database/Skills.cs (see `skillTree`). */
export const MinionSkills: MinionSkill[] = [
  ...new Map(
    skillTree.skills.map((s): [string, MinionSkill] => [
      s.id,
      {
        id: s.id,
        requiredDlcIds: s.requiredDlcIds,
        ...(s.model === 'Minion' ? {} : { model: s.model }),
      },
    ]),
  ).values(),
]

/**
 * Every skill id, regardless of content pack. Kept for callers that just want
 * the names; prefer MinionSkills where availability matters.
 */
export const MinionSkillNames: string[] = MinionSkills.map((x) => x.id)
