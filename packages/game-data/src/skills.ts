// Skill list from konove/oni-save-parser (MIT, Copyright (c) 2018 RoboPhred),
// src/save-structure/const-data/skills/skills.ts, which extracted it from the game.

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

export const MinionSkills: MinionSkill[] = [
  { id: 'Mining1', requiredDlcIds: [] },
  { id: 'Mining2', requiredDlcIds: [] },
  { id: 'Mining3', requiredDlcIds: [] },
  { id: 'Mining4', requiredDlcIds: ['EXPANSION1_ID'] },
  { id: 'Building1', requiredDlcIds: [] },
  { id: 'Building2', requiredDlcIds: [] },
  { id: 'Building3', requiredDlcIds: [] },
  { id: 'Farming1', requiredDlcIds: [] },
  { id: 'Farming2', requiredDlcIds: [] },
  { id: 'Farming3', requiredDlcIds: [] },
  { id: 'Ranching1', requiredDlcIds: [] },
  { id: 'Ranching2', requiredDlcIds: [] },
  { id: 'Researching1', requiredDlcIds: [] },
  { id: 'Researching2', requiredDlcIds: [] },
  { id: 'AtomicResearch', requiredDlcIds: ['EXPANSION1_ID'] },
  { id: 'Researching4', requiredDlcIds: ['EXPANSION1_ID'] },
  { id: 'Researching3', requiredDlcIds: [] },
  { id: 'Astronomy', requiredDlcIds: ['EXPANSION1_ID'] },
  { id: 'SpaceResearch', requiredDlcIds: ['EXPANSION1_ID'] },
  { id: 'RocketPiloting1', requiredDlcIds: ['EXPANSION1_ID'] },
  { id: 'RocketPiloting2', requiredDlcIds: ['EXPANSION1_ID'] },
  { id: 'Cooking1', requiredDlcIds: [] },
  { id: 'Cooking2', requiredDlcIds: [] },
  { id: 'Cooking3', requiredDlcIds: [] },
  { id: 'Arting1', requiredDlcIds: [] },
  { id: 'Arting2', requiredDlcIds: [] },
  { id: 'Arting3', requiredDlcIds: [] },
  { id: 'Hauling1', requiredDlcIds: [] },
  { id: 'Hauling2', requiredDlcIds: [] },
  { id: 'ThermalSuits', requiredDlcIds: [] },
  { id: 'Suits1', requiredDlcIds: [] },
  { id: 'Technicals1', requiredDlcIds: [] },
  { id: 'Technicals2', requiredDlcIds: [] },
  { id: 'Engineering1', requiredDlcIds: [] },
  { id: 'Basekeeping1', requiredDlcIds: [] },
  { id: 'Basekeeping2', requiredDlcIds: [] },
  { id: 'Pyrotechnics', requiredDlcIds: [] },
  { id: 'Astronauting1', requiredDlcIds: [] },
  { id: 'Astronauting2', requiredDlcIds: [] },
  { id: 'Medicine1', requiredDlcIds: [] },
  { id: 'Medicine2', requiredDlcIds: [] },
  { id: 'Medicine3', requiredDlcIds: [] },
  { id: 'Swimming', requiredDlcIds: ['DLC5_ID'] },
  { id: 'Swimming2', requiredDlcIds: ['DLC5_ID'] },
  { id: 'BionicsA1', requiredDlcIds: ['DLC3_ID'], model: 'BionicMinion' },
  { id: 'BionicsA2', requiredDlcIds: ['DLC3_ID'], model: 'BionicMinion' },
  { id: 'BionicsA3', requiredDlcIds: ['DLC3_ID'], model: 'BionicMinion' },
  { id: 'BionicsB1', requiredDlcIds: ['DLC3_ID'], model: 'BionicMinion' },
  { id: 'BionicsB2', requiredDlcIds: ['DLC3_ID'], model: 'BionicMinion' },
  { id: 'BionicsC1', requiredDlcIds: ['DLC3_ID'], model: 'BionicMinion' },
  { id: 'BionicsC2', requiredDlcIds: ['DLC3_ID'], model: 'BionicMinion' },
  { id: 'BionicsC3', requiredDlcIds: ['DLC3_ID'], model: 'BionicMinion' },
  { id: 'BionicsD1', requiredDlcIds: ['DLC3_ID'], model: 'BionicMinion' },
  { id: 'BionicsD2', requiredDlcIds: ['DLC3_ID'], model: 'BionicMinion' },
]

/**
 * Every skill id, regardless of content pack. Kept for callers that just want
 * the names; prefer MinionSkills where availability matters.
 */
export const MinionSkillNames: string[] = MinionSkills.map((x) => x.id)
