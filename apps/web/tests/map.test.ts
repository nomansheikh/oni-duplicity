import { readFileSync } from 'node:fs'
import { parseSave } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { worldMap } from '../src/worker/map.ts'
import { listWorlds } from '../src/worker/model.ts'
import { fixtures } from './helpers.ts'

test('every fixture world maps to complete cells', () => {
  expect(fixtures.length).toBeGreaterThan(0)
  for (const path of fixtures) {
    const save = parseSave(readFileSync(path))
    for (const world of listWorlds(save)) {
      const map = worldMap(save, world.id)
      const label = `${path.split('/').pop()} ${world.name}`
      const count = map.width * map.height
      expect(map.width, label).toBe(world.width)
      expect(map.height, label).toBe(world.height)
      expect(map.cells.length, label).toBe(count)
      expect(map.temperature.length, label).toBe(count)
      expect(map.mass.length, label).toBe(count)
      expect(
        map.cells.every((c) => c < map.elements.length),
        label,
      ).toBe(true)
      expect(map.temperature.every(Number.isFinite), label).toBe(true)
      expect(map.mass.every(Number.isFinite), label).toBe(true)
      expect(
        map.elements.reduce((n, e) => n + e.cells, 0),
        label,
      ).toBe(count)
      for (const e of map.elements) {
        expect(e.id, label).toBeTruthy()
        expect(Number.isFinite(e.mass), `${label} ${e.id}`).toBe(true)
      }
      for (const m of map.markers) {
        expect(m.x >= 0 && m.x < map.width && m.y >= 0 && m.y < map.height, label).toBe(true)
      }
    }
  }
}, 300_000)

function containerOf(save: ReturnType<typeof parseSave>, id: string) {
  const index = id.lastIndexOf(':')
  const obj = save.gameObjects.find((g) => g.name === id.slice(0, index))!.gameObjects[
    Number(id.slice(index + 1))
  ]!
  return obj.behaviors.find((b) => b.name === 'WorldContainer')!.templateData as {
    worldOffset: { x: number; y: number }
    worldSize: { x: number; y: number }
  }
}

test('a world outside the saved grid is refused instead of read past the grid', () => {
  const save = parseSave(readFileSync(fixtures[0]!))
  const id = listWorlds(save)[0]!.id
  const world = containerOf(save, id)
  const { worldOffset, worldSize } = world

  world.worldOffset = { x: 100_000, y: worldOffset.y }
  expect(() => worldMap(save, id)).toThrow(/outside the saved grid/)
  world.worldOffset = worldOffset
  world.worldSize = { x: worldSize.x * 1000, y: worldSize.y }
  expect(() => worldMap(save, id)).toThrow(/outside the saved grid/)
  world.worldSize = worldSize
  world.worldOffset = { x: -1, y: 0 }
  expect(() => worldMap(save, id)).toThrow(/invalid/)
  world.worldOffset = worldOffset
  world.worldSize = { x: 0, y: 5 }
  expect(() => worldMap(save, id)).toThrow(/invalid/)
  world.worldSize = worldSize
  expect(worldMap(save, id).width).toBe(worldSize.x)
}, 120_000)
