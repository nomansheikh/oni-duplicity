import { expect, test } from 'vite-plus/test'
import { missingIsFatal } from './fixtures-missing.ts'
import { compareSaves, encodeStateMachineController } from './compare.ts'

// Synthetic saves in the shape both parsers produce. No oracle build is needed.
const machineBytes = (): Uint8Array => new Uint8Array([1, 2, 3])
const smcDecoded = () => ({
  serializerVersion: 12,
  stateMachines: [{ leading: 0, type: 'Foo', currentState: 'On', data: machineBytes() }],
})

function makeSave(side: 'theirs' | 'ours') {
  const theirs = side === 'theirs'
  const smcRaw = new Uint8Array(encodeStateMachineController(smcDecoded()))
  return {
    header: { buildVersion: 1 },
    templates: [],
    version: { major: 7, minor: 38 },
    world: { id: theirs ? { unsigned: false, lower: -2, upper: -1 } : -2n, WidthInCells: 4 },
    settings: { name: 'colony' },
    simData: theirs ? new Uint8Array([9, 9]).buffer : new Uint8Array([9, 9]),
    gameData: null,
    ...(theirs ? {} : { warnings: [] as string[] }),
    gameObjects: [
      {
        name: 'Minion',
        gameObjects: [
          {
            position: { x: 1, y: 2, z: 3 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 },
            folder: 0,
            behaviors: [
              {
                name: 'PixelPack',
                templateData: {
                  colour: theirs
                    ? { r: 88 / 255, g: 216 / 255, b: 84 / 255, a: 1 }
                    : { r: 88, g: 216, b: 84, a: 255 },
                },
              },
              {
                name: 'Klei.AI.Modifiers',
                extraData: theirs ? { amounts: [], diseases: [] } : { amounts: [], sicknesses: [] },
                extraRaw: new Uint8Array(),
              },
              theirs
                ? {
                    name: 'StateMachineController',
                    extraData: smcDecoded(),
                    extraRaw: new Uint8Array(),
                  }
                : { name: 'StateMachineController', extraRaw: smcRaw },
            ],
          },
        ],
      },
    ],
  }
}

const real = (theirs: unknown, ours: unknown) =>
  compareSaves(theirs, ours).entries.filter((e) => e.kind === 'real')

test('representation and known differences are not failures', () => {
  const report = compareSaves(makeSave('theirs'), makeSave('ours'))
  expect(report.entries.filter((e) => e.kind === 'real')).toEqual([])
  expect(report.entries.map((e) => e.kind).sort()).toEqual([
    'known',
    'known',
    'representation',
    'representation',
    'representation',
  ])
})

test('a changed value is a real disagreement with its path and both values', () => {
  const ours = makeSave('ours')
  ours.gameObjects[0]!.gameObjects[0]!.position.x = 2
  const [entry] = real(makeSave('theirs'), ours)
  expect(entry?.example).toBe('gameObjects<Minion>[0].position.x: theirs=1 ours=2')
})

test.each([
  ['int64', (s: ReturnType<typeof makeSave>) => void (s.world.id = -3n)],
  ['simData byte', (s: ReturnType<typeof makeSave>) => void (s.simData = new Uint8Array([9, 8]))],
  [
    'colour',
    (s: ReturnType<typeof makeSave>) => {
      const b = s.gameObjects[0]!.gameObjects[0]!.behaviors[0]!
      ;(b.templateData as { colour: { r: number } }).colour.r = 89
    },
  ],
  [
    'missing key',
    (s: ReturnType<typeof makeSave>) => void delete (s.settings as { name?: string }).name,
  ],
  [
    'truncated state machine bytes',
    (s: ReturnType<typeof makeSave>) => {
      const b = s.gameObjects[0]!.gameObjects[0]!.behaviors[2] as { extraRaw: Uint8Array }
      b.extraRaw = b.extraRaw.slice(0, -1)
    },
  ],
])('tampered %s is caught', (_name, tamper) => {
  const ours = makeSave('ours')
  tamper(ours)
  expect(real(makeSave('theirs'), ours).length).toBeGreaterThan(0)
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any
const behaviors = (s: Loose) => s.gameObjects[0].gameObjects[0].behaviors

const addKey: [string, 'theirs' | 'ours', (s: Loose) => Loose][] = [
  ['oracle save', 'theirs', (s) => s],
  ['our save', 'ours', (s) => s],
  ['oracle group', 'theirs', (s) => s.gameObjects[0]],
  ['our group', 'ours', (s) => s.gameObjects[0]],
  ['oracle game object', 'theirs', (s) => s.gameObjects[0].gameObjects[0]],
  ['our game object', 'ours', (s) => s.gameObjects[0].gameObjects[0]],
  ['oracle behavior', 'theirs', (s) => behaviors(s)[0]],
  ['our behavior', 'ours', (s) => behaviors(s)[0]],
  ['oracle Modifiers data', 'theirs', (s) => behaviors(s)[1].extraData],
  ['oracle state machine data', 'theirs', (s) => behaviors(s)[2].extraData],
  ['oracle state machine', 'theirs', (s) => behaviors(s)[2].extraData.stateMachines[0]],
]

test.each(addKey)('unexpected key in %s is a real disagreement', (name, side, target) => {
  const theirs = makeSave('theirs')
  const ours = makeSave('ours')
  target(side === 'theirs' ? theirs : ours).unexpected = 1
  expect(real(theirs, ours).map((e) => e.category)).toContain(`unexpected key in ${name}`)
})

test('our parser warnings are a real disagreement', () => {
  const ours = makeSave('ours')
  ;(ours as Loose).warnings.push('unverified minor version')
  expect(real(makeSave('theirs'), ours).map((e) => e.category)).toEqual(['our parser warned'])
})

test('byte views are compared through their own window, not the whole buffer', () => {
  const whole = new Uint8Array([0, 1, 2, 3, 4, 5]).buffer
  const theirs = makeSave('theirs')
  const ours = makeSave('ours')
  theirs.simData = new Uint8Array([2, 3]).buffer
  // A view onto bytes 2..3 of a bigger buffer, and a differing one onto bytes 4..5.
  ours.simData = new Uint8Array(whole, 2, 2)
  expect(real(theirs, ours)).toEqual([])
  ours.simData = new Uint8Array(whole, 4, 2)
  expect(real(theirs, ours).map((e) => e.category)).toEqual(['bytes differ'])
  // Non-Uint8Array views too.
  theirs.simData = new Uint8Array([2, 3]).buffer
  ;(ours as Loose).simData = new DataView(whole, 2, 2)
  expect(real(theirs, ours)).toEqual([])
})

test('missing fixtures are fatal when committed or under CI only', () => {
  expect(missingIsFatal({ committed: true }, {})).toBe(true)
  expect(missingIsFatal({ committed: false }, { CI: 'true' })).toBe(true)
  expect(missingIsFatal({ committed: false }, {})).toBe(false)
})
