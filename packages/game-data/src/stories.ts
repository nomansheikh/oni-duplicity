/**
 * Story traits and their quests.
 *
 * Transcribed from `Database.Stories` and `Database.Quests` (Assembly-CSharp). The save
 * stores a story under its ID (`StoryInstance.storyId`) and a quest under the HashedString
 * hash of its ID; `tests/stories.test.ts` checks the hashes against the test saves.
 */

export interface StoryEntry {
  /** `StoryInstance.storyId`. */
  id: string
  name: string
  /** `Story.displayOrder`. */
  order: number
}

export const stories: StoryEntry[] = [
  { id: 'MegaBrainTank', name: 'Mega Brain Tank', order: 0 },
  { id: 'CreatureManipulator', name: 'Critter Manipulator', order: 1 },
  { id: 'LonelyMinion', name: 'Lonely Minion', order: 2 },
  { id: 'FossilHunt', name: 'Fossil Hunt', order: 3 },
  { id: 'MorbRoverMaker', name: 'Morb Rover Maker', order: 4 },
  { id: 'HijackHeadquarters', name: 'Hijacked Headquarters', order: 5 },
]

export interface StoryQuestEntry {
  /** Quest ID in `Database.Quests`; the save keys quests by its hash. */
  id: string
  /** The story the quest belongs to. */
  story: string
  name: string
  /** Quest criteria in code, as a short description of what satisfies the quest. */
  goal: string
}

export const storyQuests: StoryQuestEntry[] = [
  { id: 'KnockQuest', story: 'LonelyMinion', name: 'Greeting', goal: 'A neighbour knocks' },
  { id: 'FoodQuest', story: 'LonelyMinion', name: 'Food', goal: '3 different foods of quality 4+' },
  { id: 'PluggedIn', story: 'LonelyMinion', name: 'Power', goal: '3000 W supplied' },
  { id: 'HighDecor', story: 'LonelyMinion', name: 'Decor', goal: 'Decor of 120+' },
  {
    id: 'FossilHuntQuest',
    story: 'FossilHunt',
    name: 'Lost specimens',
    goal: 'Recover the specimen and the ice, resin and rock fossils',
  },
]
