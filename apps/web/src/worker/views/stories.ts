import {
  hashString,
  humanize,
  stories as storyCatalog,
  storyQuests,
} from '@oni-duplicity/game-data'
import type { SaveGame } from '@oni-duplicity/save-parser'
import { behavior, saveGameObject } from '../save-helpers.ts'
import type { StoryState, StoryView } from '../story-types.ts'
import { worldBoxes } from '../world-boxes.ts'

const STORY_STATES: Record<number, StoryState> = {
  [-1]: 'retrofitted',
  0: 'notStarted',
  1: 'discovered',
  2: 'inProgress',
  3: 'complete',
}
const QUEST_STATES = ['notStarted', 'inProgress', 'completed'] as const

/** Prefab whose `Activatable` shows whether a story machine was switched on. */
const STORY_MACHINES: Record<string, string> = {
  CreatureManipulator: 'GravitasCreatureManipulator',
  HijackHeadquarters: 'HijackedHeadquarters',
  MegaBrainTank: 'MegaBrainTank',
}

/**
 * Read-only: story states from `StoryManager`, quest progress from `QuestManager`.
 * Returns an empty list for a save without a `StoryManager`.
 */
export function listStories(save: SaveGame): StoryView[] {
  const saveGame = saveGameObject(save)
  const manager = saveGame ? behavior(saveGame, 'StoryManager')?.templateData : undefined
  const instances = (manager?._stories ?? []) as [
    number,
    {
      storyId: string
      worldId: number
      state: number
      telemetry?: { Retrofitted: number; Discovered: number; InProgress: number; Completed: number }
    },
  ][]
  const questManager = saveGame ? behavior(saveGame, 'QuestManager')?.templateData : undefined
  // Quests are saved per owner: the Lonely Minion's house, or the fossil dig site. Each story
  // exists once per save, so a story's quests belong to one owner; with several, none is shown.
  const questsByOwner = new Map<number, Map<number, number>>()
  for (const [owner, quests] of (questManager?.ownerToQuests ?? []) as [
    number,
    [{ hash: number }, { currentState: number }][],
  ][]) {
    questsByOwner.set(owner, new Map(quests.map(([key, quest]) => [key.hash, quest.currentState])))
  }
  const worlds = worldBoxes(save)
  const cycle = (value: number | undefined) =>
    typeof value === 'number' && value >= 0 ? value : undefined
  return instances
    .map(([, story]) => {
      const entry = storyCatalog.find((s) => s.id === story.storyId)
      const t = story.telemetry
      const world = worlds.find((w) => w.id === story.worldId)
      const machine = STORY_MACHINES[story.storyId]
      // The machine's `Activatable`, for the copy standing in the story's own world.
      const activations = machine
        ? (save.gameObjects.find((g) => g.name === machine)?.gameObjects ?? [])
            .filter(
              (obj) =>
                world !== undefined &&
                obj.position.x >= world.x &&
                obj.position.x < world.x + world.width &&
                obj.position.y >= world.y &&
                obj.position.y < world.y + world.height,
            )
            .map((obj) => behavior(obj, 'Activatable')?.templateData?.activated)
            .filter((v): v is boolean => typeof v === 'boolean')
        : []
      const cycles: StoryView['cycles'] = {}
      for (const [key, value] of [
        ['retrofitted', t?.Retrofitted],
        ['discovered', t?.Discovered],
        ['inProgress', t?.InProgress],
        ['completed', t?.Completed],
      ] as const) {
        const found = cycle(value)
        if (found !== undefined) cycles[key] = found
      }
      const catalogQuests = storyQuests.filter((q) => q.story === story.storyId)
      const owners = [...questsByOwner.values()].filter((quests) =>
        catalogQuests.some((q) => quests.has(hashString(q.id))),
      )
      const owned = owners.length === 1 ? owners[0] : undefined
      return {
        order: entry?.order ?? Number.MAX_SAFE_INTEGER,
        view: {
          id: story.storyId,
          name: entry?.name ?? humanize(story.storyId),
          state: STORY_STATES[story.state] ?? 'unknown',
          world: world?.name,
          cycles,
          quests: catalogQuests
            .filter((q) => owned?.has(hashString(q.id)))
            .map((q) => ({
              id: q.id,
              name: q.name,
              goal: q.goal,
              state: QUEST_STATES[owned?.get(hashString(q.id)) ?? 0] ?? 'unknown',
            })),
          activated: activations.length > 0 ? activations.some(Boolean) : undefined,
        } satisfies StoryView,
      }
    })
    .sort((a, b) => a.order - b.order)
    .map((r) => r.view)
}
