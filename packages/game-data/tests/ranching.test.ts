import { expect, test } from 'vite-plus/test'
import { findRanchSpecies, ranching } from '../src/index.ts'

const species = (id: string) => {
  const s = findRanchSpecies(id)
  if (!s) throw new Error(`missing ${id}`)
  return s
}

test('covers the species the hand-written table missed', () => {
  for (const id of [
    'IceBelly',
    'GoldBelly',
    'Staterpillar',
    'StaterpillarGas',
    'StaterpillarLiquid',
    'Snail',
    'SnailIron',
    'PrehistoricPacu',
    'Raptor',
  ]) {
    expect(findRanchSpecies(id)).toBeDefined()
  }
})

test('nothing could not be read', () => {
  expect(ranching.gaps).toEqual([])
})

test('Hatch values match the decompiled tuning', () => {
  const hatch = species('Hatch')
  expect(hatch.spacePerCritter).toBe(12)
  expect(hatch.caloriesPerCycle).toBeCloseTo(700000, 0)
  expect(hatch.lifespanCycles).toBe(100)
  expect(hatch.egg?.fertilityCycles).toBeCloseTo(60, 3)
  expect(hatch.egg?.incubationCycles).toBe(20)
  expect(hatch.egg?.chances.map((c) => c.speciesId)).toEqual(['Hatch', 'HatchHard', 'HatchVeggie'])
  expect(hatch.deathDrops).toEqual([{ id: 'Meat', name: 'Meat', kg: 2 }])
})

test('Hatch eats every rock the diet builder lists and every food with calories', () => {
  const hatch = species('Hatch')
  const sand = hatch.diet.find((d) => d.id === 'Sand')
  expect(sand).toMatchObject({
    kind: 'solid',
    calories: 5000,
    produces: { id: 'Carbon', ratio: 0.5 },
  })
  expect(hatch.diet.length).toBeGreaterThan(60)
  expect(hatch.diet.some((d) => d.id === 'Mushroom')).toBe(true)
})

test('seed diets expand into each seed with its own entry', () => {
  const pacu = species('Pacu')
  const seeds = pacu.diet.filter((d) => d.id.endsWith('Seed'))
  expect(seeds.length).toBeGreaterThan(10)
  expect(seeds.find((d) => d.id === 'BasicSingleHarvestPlantSeed')?.name).toBe('Mealwood Seed')
  expect(pacu.diet.some((d) => d.id === 'KelpPlantSeed')).toBe(false)
})

test('metal diets resolve to concrete ores and refined metals', () => {
  const plug = species('Staterpillar')
  expect(plug.dlcIds).toContain('EXPANSION1_ID')
  expect(plug.diet.some((d) => d.id === 'Copper')).toBe(true)
  expect(plug.diet.some((d) => d.id === 'FoolsGold')).toBe(false)
})

test('DLC species carry their DLC ids', () => {
  expect(species('IceBelly').dlcIds).toEqual(['DLC2_ID'])
  expect(species('Snail').dlcIds).toEqual(['DLC5_ID'])
})

test('every diet entry has a display name, calories and a known kind', () => {
  for (const s of ranching.species) {
    expect(s.diet.length, s.id).toBeGreaterThan(0)
    for (const d of s.diet) {
      expect(d.name, `${s.id} ${d.id}`).toBeTruthy()
      expect(['solid', 'plant', 'plantStorage', 'prey']).toContain(d.kind)
      expect(d.calories, `${s.id} ${d.id}`).toBeGreaterThan(0)
    }
  }
})

test('morph odds point at real species', () => {
  for (const s of ranching.species) {
    for (const c of s.egg?.chances ?? []) expect(findRanchSpecies(c.speciesId), s.id).toBeDefined()
  }
})

test('shear and milk products are read from the monitors', () => {
  expect(species('Drecko').products[0]).toMatchObject({
    kind: 'shear',
    item: 'BasicFabric',
    kg: 2,
    cycles: 8,
  })
  expect(species('Moo').products[0]).toMatchObject({ kind: 'milk', capacityKg: 200 })
})

test('wild critters use the modifiers from ExtendEntityToWildCreature', () => {
  expect(ranching.wild).toEqual({
    metabolismModifier: -75,
    metabolismBase: 100,
    scaleGrowthMultiplier: -0.75,
  })
})

test('stable and rancher constants are read from the room type and the grooming station', () => {
  expect(ranching.stable).toEqual({ minCells: 12, maxCells: 96 })
  expect(ranching.rancher).toEqual({
    workSeconds: 12,
    ranchedEffectSeconds: 600,
    durationPerRanchingPoint: 0.1,
  })
})

test('fish are the swimmers', () => {
  expect(species('Pacu').swims).toBe(true)
  expect(species('Hatch').swims).toBe(false)
})
