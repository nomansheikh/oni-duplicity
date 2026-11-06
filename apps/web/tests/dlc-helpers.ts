import { readFileSync } from 'node:fs'
import { hashString } from '@oni-duplicity/game-data'
import { parseSave, writeSaveParts, type SaveGame } from '@oni-duplicity/save-parser'
import { fixtures } from './helpers.ts'

const find = (name: string) => fixtures.find((path) => path.endsWith(name))
export const konove = find('konove-save-game.sav')
export const mithro06 = find('mithro-06-maximum-cycle-4770.sav')
export const load = (path: string) => parseSave(readFileSync(path))
export const body = (save: SaveGame) => writeSaveParts(save).body.slice()

export const impactor = (save: SaveGame) =>
  save.gameObjects.find((g) => g.name === 'LargeImpactor')!
export const machine = (save: SaveGame) =>
  impactor(save).gameObjects[0]!.behaviors.find((b) => b.name === 'StateMachineController')!
export const event = (save: SaveGame) =>
  (
    save.gameObjects
      .find((g) => g.name === 'SaveGame')!
      .gameObjects[0]!.behaviors.find((b) => b.name === 'GameplayEventManager')!.templateData as {
      activeEvents: { eventStartTime: number }[]
    }
  ).activeEvents[0]!

// --- Synthetic saves: the layout logic without any fixture ---------------------------------

export const enc = new TextEncoder()
const i32 = (n: number) => {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setInt32(0, n, true)
  return b
}
const f32 = (n: number) => {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setFloat32(0, n, true)
  return b
}
const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}
const str = (text: string) => cat(i32(text.length), enc.encode(text))

/** `[name][-1][state][dataLen]` then the machine's own fields, then its parameters. */
function machineBytes(type: string, fields: Uint8Array, params: Uint8Array[]): Uint8Array {
  return cat(str(type), i32(-1), str('root.state'), i32(0), fields, i32(params.length), ...params)
}
function intParam(name: string, value: number): Uint8Array {
  const type = str('StateMachine`4+IntParameter+Context[[X]]')
  const inner = cat(type, str(name), i32(value))
  return cat(i32(inner.length), inner)
}

export interface Synthetic {
  dlcIds?: string[]
  now?: { cycle: number; progress: number }
  start?: number
  difficulty?: string
  event?: boolean
  impactor?: boolean
  traveler?: boolean
  /** Saved arrival in seconds; null leaves the flight machine out. */
  arrival?: number | null
  speed?: number
  health?: number
}

export function synthetic(o: Synthetic = {}): SaveGame {
  const {
    dlcIds = ['EXPANSION1_ID', 'DLC4_ID'],
    now = { cycle: 10, progress: 300 },
    start = 2,
    difficulty = 'Default',
    event = true,
    impactor = true,
    traveler = true,
    arrival = (start + 200) * 600,
    speed = 0.05,
    health = 900,
  } = o
  const behaviors = [
    {
      name: 'GameplayEventManager',
      templateData: {
        activeEvents: event
          ? [{ eventID: { hash: hashString('LargeImpactor') }, eventStartTime: start }]
          : [],
      },
      extraRaw: new Uint8Array(),
    },
    {
      name: 'GameClock',
      templateData: { cycle: now.cycle, timeSinceStartOfCycle: now.progress },
      extraRaw: new Uint8Array(),
    },
  ]
  const flight =
    arrival === null
      ? []
      : [
          machineBytes(
            'ClusterMapLargeImpactor+Instance',
            cat(i32(0), f32(arrival), f32(speed)),
            [],
          ),
        ]
  const blob = cat(
    machineBytes('LargeImpactorStatus+Instance', new Uint8Array(), [intParam('Health', health)]),
    ...flight,
  )
  const object = {
    behaviors: [
      { name: 'StateMachineController', templateData: {}, extraRaw: blob },
      ...(traveler
        ? [{ name: 'ClusterTraveler', templateData: {}, extraRaw: new Uint8Array() }]
        : []),
    ],
  }
  return {
    header: { gameInfo: { dlcIds } },
    gameData: {
      customGameSettings: {
        CurrentQualityLevelsBySetting: [['DemoliorDifficulty', difficulty]],
      },
    },
    gameObjects: [
      { name: 'SaveGame', gameObjects: [{ behaviors }] },
      ...(impactor ? [{ name: 'LargeImpactor', gameObjects: [object] }] : []),
    ],
  } as unknown as SaveGame
}
