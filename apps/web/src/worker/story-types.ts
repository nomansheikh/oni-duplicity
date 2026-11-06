/** `StoryInstance.State`; RETROFITTED (-1) is added by the game to saves that predate a story. */
export type StoryState =
  | 'retrofitted'
  | 'notStarted'
  | 'discovered'
  | 'inProgress'
  | 'complete'
  /** A state value this version of the editor does not know. */
  | 'unknown'

export interface StoryQuestView {
  id: string
  name: string
  goal: string
  /** `Quest.State`. */
  state: 'notStarted' | 'inProgress' | 'completed' | 'unknown'
}

export interface StoryView {
  id: string
  name: string
  state: StoryState
  /** The asteroid the story was created on, if it can be found. */
  world: string | undefined
  /** Cycle each state was first reached; absent if never. */
  cycles: { discovered?: number; inProgress?: number; completed?: number; retrofitted?: number }
  quests: StoryQuestView[]
  /** Decoded building flags that show progress, e.g. the Activatable of a Gravitas machine. */
  activated: boolean | undefined
}
