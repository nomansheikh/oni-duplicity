import { existsSync, readFileSync } from 'node:fs'
import { hashString, stories as catalog, storyQuests } from '@oni-duplicity/game-data'
import { parseSave, writeSave, type SaveGame } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { listStories, listWorlds, saveGameObject } from '../src/worker/model.ts'
import { fixtures, galaxy } from './helpers.ts'

const saves = galaxy.replace('saves/beautiful-galaxy.sav', '')
const apple = `${saves}saves/apple-park.sav`
const baseGame = `${saves}fetched/mithro-03-late-game-cycle-1160.sav`

interface StoryRow {
  storyId: string
  worldId: number
  state: number
  telemetry: Record<string, number>
}

function pairs(save: SaveGame): [number, StoryRow][] {
  const found = saveGameObject(save)?.behaviors.find((b) => b.name === 'StoryManager')
  if (!found?.templateData) throw new Error('fixture has no StoryManager')
  return found.templateData._stories as [number, StoryRow][]
}

function rows(save: SaveGame): StoryRow[] {
  return pairs(save).map(([, s]) => s)
}

test('lists the stories of a fresh save as not started', () => {
  const stories = listStories(parseSave(readFileSync(apple)))
  expect(stories.map((s) => s.id)).toEqual([
    'MegaBrainTank',
    'LonelyMinion',
    'FossilHunt',
    'MorbRoverMaker',
    'HijackHeadquarters',
  ])
  expect(stories.every((s) => s.state === 'notStarted')).toBe(true)
  expect(stories.every((s) => Object.keys(s.cycles).length === 0)).toBe(true)
  expect(stories.every((s) => s.activated === undefined)).toBe(true)
})

test('reads states, cycles, quests and machine flags from a played save', () => {
  const save = parseSave(readFileSync(galaxy))
  const byId = new Map(listStories(save).map((s) => [s.id, s]))
  expect(byId.get('MegaBrainTank')).toMatchObject({
    name: 'Mega Brain Tank',
    state: 'discovered',
    activated: false,
  })
  expect(byId.get('MegaBrainTank')?.cycles.discovered).toBeCloseTo(16.39, 2)
  expect(byId.get('CreatureManipulator')).toMatchObject({ state: 'discovered', activated: false })
  expect(byId.get('MorbRoverMaker')?.state).toBe('inProgress')
  expect(byId.get('MorbRoverMaker')?.cycles.inProgress).toBeCloseTo(84.82, 2)
  expect(byId.get('HijackHeadquarters')).toMatchObject({ state: 'inProgress', activated: true })
  expect(byId.get('LonelyMinion')?.quests.map((q) => q.id)).toEqual([
    'KnockQuest',
    'FoodQuest',
    'PluggedIn',
    'HighDecor',
  ])
  expect(byId.get('LonelyMinion')?.quests.every((q) => q.state === 'notStarted')).toBe(true)
})

test('places each story on an asteroid that exists in the save', () => {
  const save = parseSave(readFileSync(galaxy))
  const names = new Set(listWorlds(save).map((w) => w.name))
  for (const story of listStories(save)) {
    expect(story.world, story.id).toBeDefined()
    expect(names.has(story.world as string), story.id).toBe(true)
  }
})

test('reports retrofitted, complete and unknown states as they are', () => {
  const save = parseSave(readFileSync(galaxy))
  const [first, second, third, fourth] = rows(save)
  first.state = -1
  first.telemetry.Retrofitted = 12.5
  second.state = 3
  second.telemetry.Completed = 99.9
  third.state = 7
  fourth.state = -3
  const byId = new Map(listStories(save).map((s) => [s.id, s]))
  expect(byId.get(first.storyId)).toMatchObject({
    state: 'retrofitted',
    cycles: { retrofitted: 12.5 },
  })
  expect(byId.get(second.storyId)).toMatchObject({ state: 'complete', cycles: { completed: 99.9 } })
  expect(byId.get(third.storyId)?.state).toBe('unknown')
  expect(byId.get(fourth.storyId)?.state).toBe('unknown')
})

test('keeps an unknown story ID, sorted last, and a missing world as undefined', () => {
  const save = parseSave(readFileSync(galaxy))
  const [row] = rows(save)
  row.storyId = 'SomeModStory'
  row.worldId = 9999
  const stories = listStories(save)
  expect(stories.at(-1)).toMatchObject({ id: 'SomeModStory', name: 'Some Mod Story' })
  expect(stories.at(-1)?.world).toBeUndefined()
  expect(stories.at(-1)?.activated).toBeUndefined()
})

test('a save without a StoryManager lists nothing', () => {
  const save = parseSave(readFileSync(apple))
  const object = saveGameObject(save)
  if (!object) throw new Error('no SaveGame object')
  object.behaviors = object.behaviors.filter((b) => b.name !== 'StoryManager')
  expect(listStories(save)).toEqual([])
})

test('quests of several owners are not merged', () => {
  const save = parseSave(readFileSync(galaxy))
  const behavior = saveGameObject(save)?.behaviors.find((b) => b.name === 'QuestManager')
  const owners = behavior?.templateData?.ownerToQuests as [number, unknown][]
  owners.push([12345, structuredClone(owners[0][1])])
  const lonely = listStories(save).find((s) => s.id === 'LonelyMinion')
  expect(lonely?.quests).toEqual([])
})

test('listing stories leaves the save byte for byte unchanged', () => {
  const save = parseSave(readFileSync(galaxy))
  const before = writeSave(save)
  listStories(save)
  expect(Buffer.from(writeSave(save)).equals(Buffer.from(before))).toBe(true)
})

test('the catalog covers every story and quest ID', () => {
  expect(new Set(catalog.map((s) => s.id)).size).toBe(catalog.length)
  expect(new Set(storyQuests.map((q) => hashString(q.id))).size).toBe(storyQuests.length)
  for (const quest of storyQuests) expect(catalog.some((s) => s.id === quest.story)).toBe(true)
})

test.skipIf(!existsSync(baseGame))(
  'reads a base-game save, with completed stories and their cycles',
  () => {
    const save = parseSave(readFileSync(baseGame))
    expect(save.header.gameInfo.dlcIds ?? []).not.toContain('EXPANSION1_ID')
    const byId = new Map(listStories(save).map((s) => [s.id, s]))
    expect(byId.get('MegaBrainTank')).toMatchObject({ state: 'complete', activated: true })
    expect(byId.get('MegaBrainTank')?.cycles.completed).toBeGreaterThan(0)
    expect(byId.get('FossilHunt')?.state).toBe('inProgress')
    expect(byId.get('FossilHunt')?.quests.length).toBeGreaterThan(0)
  },
)

test.skipIf(process.env.FIXTURE_TIER !== 'all')(
  'every fixture lists only known stories on an asteroid in the save',
  () => {
    for (const path of fixtures) {
      const save = parseSave(readFileSync(path))
      const names = new Set(listWorlds(save).map((w) => w.name))
      for (const story of listStories(save)) {
        const label = `${path.split('/').pop()} ${story.id}`
        expect(
          catalog.some((s) => s.id === story.id),
          label,
        ).toBe(true)
        expect(story.state, label).not.toBe('unknown')
        expect(names.has(story.world as string), label).toBe(true)
      }
    }
  },
  300_000,
)
