import { expect, test } from 'vite-plus/test'
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
