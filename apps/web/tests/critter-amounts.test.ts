import { readFileSync } from 'node:fs'
import { critterAmountMax, critterLimits, fixedAmountMax } from '@oni-duplicity/game-data'
import { parseSave, writeSaveParts, type SaveGame } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { applyEdit, listCritters, type CritterView } from '../src/worker/model.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { fixtures, galaxy, sameBytes } from './helpers.ts'

// The limits are transcribed from the decompile, so the saves are the check: a critter the game
// saved can never sit above a maximum we call confirmed.
test('no fixture critter is above a confirmed maximum', () => {
  let checked = 0
  const over: string[] = []
  const unconfirmed = new Set<string>()
  for (const path of fixtures) {
    const save = parseSave(readFileSync(path))
    for (const c of listCritters(save)) {
      for (const a of c.amounts) {
        if (a.max === undefined) {
          unconfirmed.add(`${c.prefab}/${a.id}`)
          continue
        }
        checked++
        if (a.value > a.max + 1e-3 || a.value < 0) {
          over.push(`${path.split('/').pop()}: ${c.prefab} ${a.id} ${a.value} > ${a.max}`)
        }
      }
    }
  }
  expect(over).toEqual([])
  expect(checked).toBeGreaterThan(1000)
  // Only hit points we could not confirm, and amounts of prefabs outside the table, are left out.
  expect([...unconfirmed].filter((u) => !u.endsWith('/HitPoints'))).toEqual([])
}, 300_000)

const apple = galaxy.replace('beautiful-galaxy.sav', 'apple-park.sav')
const fullTier = process.env.FIXTURE_TIER === 'all'
const mithro6 = galaxy.replace(
  'saves/beautiful-galaxy.sav',
  'fetched/mithro-06-maximum-cycle-4770.sav',
)

function expectMax(critters: CritterView[], prefab: string, amountId: string, max: number) {
  const found = critters.filter(
    (c) => c.prefab === prefab && c.amounts.some((a) => a.id === amountId),
  )
  expect(found.length, `${prefab} ${amountId}`).toBeGreaterThan(0)
  for (const c of found) expect(c.amounts.find((a) => a.id === amountId)!.max).toBe(max)
}

test('DLC amounts of the colony show the stored value with their maximum', () => {
  const critters = listCritters(parseSave(readFileSync(galaxy)))
  expectMax(critters, 'SeaTurtle', 'ScaleGrowth', fixedAmountMax.ScaleGrowth!)
  expectMax(critters, 'Squid', 'MilkProduction', fixedAmountMax.MilkProduction!)
  expectMax(critters, 'SeaTurtle', 'Age', 100)
  expectMax(critters, 'PufferFish', 'Calories', 2000000)
  expectMax(critters, 'Bee', 'Age', 5)
  // The decompile gives two hit point values for a sea turtle, so it stays read only.
  const turtle = critters.find((c) => c.prefab === 'SeaTurtle')!
  expect(turtle.amounts.find((a) => a.id === 'HitPoints')!.readOnlyReason).toBeDefined()
  expect(turtle.amounts.find((a) => a.id === 'HitPoints')!.max).toBeUndefined()
}, 120_000)

test('slogo moisture and mucus are bounded', () => {
  const critters = listCritters(parseSave(readFileSync(apple)))
  expectMax(critters, 'Snail', 'Moisture', 100)
  expectMax(critters, 'Snail', 'Mucus', 10)
}, 120_000)

test.skipIf(!fullTier)(
  'beckoning, milk and robot batteries are bounded',
  () => {
    const critters = listCritters(parseSave(readFileSync(mithro6)))
    expectMax(critters, 'Moo', 'Beckoning', 100)
    expectMax(critters, 'Moo', 'MilkProduction', 100)
    expectMax(critters, 'FetchDrone', 'InternalElectroBank', 120000)
    expectMax(critters, 'MorbRover', 'InternalBioBattery', 180000)
    expectMax(critters, 'SweepBot', 'InternalBattery', 9000)
  },
  120_000,
)

test('a prefab is read only when the save lacks its DLC', () => {
  expect(critterAmountMax('Raptor', 'Age', ['DLC4_ID'])).toEqual({ max: 200 })
  expect(critterAmountMax('RaptorBaby', 'Age', ['DLC4_ID'])).toEqual({ max: 200 })
  expect(critterAmountMax('Raptor', 'Age', ['EXPANSION1_ID']).max).toBeUndefined()
  expect(critterAmountMax('Raptor', 'Wildness', []).max).toBeUndefined()
  expect(critterAmountMax('Nope', 'Age', []).max).toBeUndefined()
  expect(Object.keys(critterLimits).length).toBeGreaterThan(50)
}, 120_000)

const find = (save: SaveGame, prefab: string): CritterView =>
  listCritters(save).find((c) => c.prefab === prefab)!
const body = (save: SaveGame) => writeSaveParts(save).body.slice()

test('setAmount clamps to the maximum and refuses what is not finite', () => {
  const save = parseSave(readFileSync(galaxy))
  const target = find(save, 'SeaTurtle')
  const value = () => find(save, 'SeaTurtle').amounts.find((a) => a.id === 'ScaleGrowth')!.value
  const edit = (v: number) =>
    applyEdit(save, { type: 'setAmount', id: target.id, amountId: 'ScaleGrowth', value: v })

  edit(1e9)
  expect(value()).toBe(100)
  edit(-5)
  expect(value()).toBe(0)
  for (const bad of [NaN, Infinity, -Infinity]) expect(() => edit(bad)).toThrow()
  expect(value()).toBe(0)

  expect(() =>
    applyEdit(save, { type: 'setAmount', id: target.id, amountId: 'HitPoints', value: 10 }),
  ).toThrow(/read only/)
}, 120_000)

test('undoing a clamped critter amount edit gives back the same bytes', () => {
  const save = parseSave(readFileSync(galaxy))
  const before = body(save)
  for (const [prefab, amountId, value] of [
    ['SeaTurtle', 'ScaleGrowth', 7],
    ['Squid', 'MilkProduction', 41],
    ['PufferFish', 'Calories', 1e12],
    ['Bee', 'Age', 1e6],
    ['PacuTropical', 'Wildness', 55],
  ] as const) {
    const c = find(save, prefab)
    const undo = applyWithRestore(save, { type: 'setAmount', id: c.id, amountId, value })
    expect(sameBytes(body(save), before), `${prefab} ${amountId} changed nothing`).toBe(false)
    undo()
    expect(sameBytes(body(save), before), `${prefab} ${amountId} undone`).toBe(true)
  }
}, 120_000)

test('a critter whose DLC the save lacks is read only and the edit changes nothing', () => {
  const save = parseSave(readFileSync(galaxy))
  const info = save.header.gameInfo as { dlcIds: string[] }
  info.dlcIds = info.dlcIds.filter((id) => id !== 'DLC5_ID')
  const turtle = find(save, 'SeaTurtle')
  for (const a of turtle.amounts) {
    expect(a.max, a.id).toBeUndefined()
    expect(a.readOnlyReason, a.id).toMatch(/DLC/)
  }
  const before = body(save)
  const gameInfo = JSON.stringify(save.header.gameInfo)
  expect(() =>
    applyWithRestore(save, {
      type: 'setAmount',
      id: turtle.id,
      amountId: 'ScaleGrowth',
      value: 10,
    }),
  ).toThrow(/read only/)
  expect(sameBytes(body(save), before)).toBe(true)
  expect(JSON.stringify(save.header.gameInfo)).toBe(gameInfo)
})

// Robots are critters to the editor; the sweep bot sits in a small-tier fixture.
const mithro2 = galaxy.replace(
  'saves/beautiful-galaxy.sav',
  'fetched/mithro-02-mid-game-cycle-148.sav',
)

test.skipIf(!fixtures.includes(mithro2))(
  'a sweep bot goes through the gate',
  () => {
    const save = parseSave(readFileSync(mithro2))
    const bot = find(save, 'SweepBot')
    const battery = () => find(save, 'SweepBot').amounts.find((a) => a.id === 'InternalBattery')!
    expect(battery().max).toBe(9000)
    // A sweep bot has no hit point trait, so that amount is read only.
    expect(bot.amounts.find((a) => a.id === 'HitPoints')!.max).toBeUndefined()

    const before = body(save)
    const undo = applyWithRestore(save, {
      type: 'setAmount',
      id: bot.id,
      amountId: 'InternalBattery',
      value: 1e9,
    })
    expect(battery().value).toBe(9000)
    undo()
    expect(sameBytes(body(save), before)).toBe(true)
    expect(() =>
      applyEdit(save, { type: 'setAmount', id: bot.id, amountId: 'HitPoints', value: 5 }),
    ).toThrow(/read only/)
  },
  120_000,
)
