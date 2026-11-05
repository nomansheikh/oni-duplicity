import { readFileSync } from 'node:fs'
import { hashString, stories as catalog, storyQuests } from '@oni-duplicity/game-data'
import { parseSave } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { listStories, listWorlds } from '../src/worker/model.ts'
import { fixtures, galaxy } from './helpers.ts'

const apple = galaxy.replace('beautiful-galaxy.sav', 'apple-park.sav')

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
})

test('reads states, cycles, quests and machine flags from a played save', () => {
  const save = parseSave(readFileSync(galaxy))
  const stories = listStories(save)
  const byId = new Map(stories.map((s) => [s.id, s]))
  expect(byId.get('MegaBrainTank')).toMatchObject({
    name: 'Mega Brain Tank',
    state: 'discovered',
    activated: false,
  })
  expect(byId.get('MegaBrainTank')?.cycles.discovered).toBeCloseTo(16.39, 2)
  expect(byId.get('CreatureManipulator')?.state).toBe('discovered')
  expect(byId.get('CreatureManipulator')?.activated).toBe(false)
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

test('the catalog covers every story and quest ID', () => {
  expect(new Set(catalog.map((s) => s.id)).size).toBe(catalog.length)
  expect(new Set(storyQuests.map((q) => hashString(q.id))).size).toBe(storyQuests.length)
  for (const quest of storyQuests) expect(catalog.some((s) => s.id === quest.story)).toBe(true)
})

test.skipIf(process.env.FIXTURE_TIER !== 'all')(
  'every fixture lists only known stories in a known state',
  () => {
    for (const path of fixtures) {
      for (const story of listStories(parseSave(readFileSync(path)))) {
        const label = `${path.split('/').pop()} ${story.id}`
        expect(
          catalog.some((s) => s.id === story.id),
          label,
        ).toBe(true)
        expect(story.world, label).toBeDefined()
      }
    }
  },
  300_000,
)
