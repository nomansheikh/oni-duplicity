import { expect, test } from 'vite-plus/test'
import {
  findWorldgenCluster,
  findWorldgenTrait,
  findWorldgenWorld,
  worldgenClusters,
  worldgenTraits,
  worldgenWorlds,
} from '../src/index.ts'

test('every cluster has a unique prefix, a real name and exactly one start world', () => {
  expect(new Set(worldgenClusters.map((c) => c.prefix)).size).toBe(worldgenClusters.length)
  for (const cluster of worldgenClusters) {
    expect(cluster.name, cluster.layout).not.toMatch(/^STRINGS\./)
    expect(
      cluster.worlds.filter((w) => w.start),
      cluster.layout,
    ).toHaveLength(1)
  }
})

test('the Spaced Out sandstone start lists its full asteroid set, start first', () => {
  const cluster = findWorldgenCluster('SNDST-C')!
  expect(cluster.layout).toBe('expansion1::clusters/SandstoneStartCluster')
  expect(cluster.name).toBe('Terrania Cluster')
  expect(cluster.requiredDlcIds).toEqual(['EXPANSION1_ID'])
  expect(cluster.worlds.map((w) => w.id)).toEqual([
    'TerraMoonlet',
    'IdealLandingSite',
    'WarpOilySwamp',
    'TundraMoonlet',
    'MarshyMoonlet',
    'MooMoonlet',
    'WaterMoonlet',
    'NiobiumMoonlet',
    'RegolithMoonlet',
  ])
  expect(cluster.worlds[0]).toMatchObject({ start: true })
})

test('base-game clusters need no DLC', () => {
  expect(findWorldgenCluster('SNDST-A')).toMatchObject({
    layout: 'clusters/SandstoneDefault',
    requiredDlcIds: [],
  })
})

test('world traits keep the generator ids and carry names and descriptions', () => {
  expect(findWorldgenTrait('traits/MetalRich')).toMatchObject({ name: 'Metal Rich' })
  expect(findWorldgenTrait('expansion1::traits/Volcanoes')?.name).toBe('Volcanic Activity')
  for (const trait of worldgenTraits) expect(trait.desc, trait.id).toBeTruthy()
})

test('worlds resolve by path and by id', () => {
  expect(findWorldgenWorld('expansion1::worlds/TerraMoonlet')?.name).toBe('Terrania Asteroid')
  expect(findWorldgenWorld('TerraMoonlet')?.path).toBe('expansion1::worlds/TerraMoonlet')
  for (const world of worldgenWorlds) expect(world.name, world.path).not.toMatch(/^STRINGS\./)
})
