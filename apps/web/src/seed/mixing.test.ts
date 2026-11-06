import { mixingSettings } from '@oni-duplicity/game-data'
import { describe, expect, it } from 'vite-plus/test'
import { clusterByPrefix } from './clusters.ts'
import {
  coordinateDlcs,
  decodeMixing,
  dlcsInPlay,
  encodeMixing,
  fitMixing,
  guaranteeRoom,
  mixingAvailable,
  mixingBlocker,
  mixingFor,
  remixWorlds,
} from './mixing.ts'

const cluster = (prefix: string) => clusterByPrefix(prefix)!
const setting = (id: string) => mixingSettings.find((s) => s.id === id)!

describe('encodeMixing', () => {
  it('writes no mixing as 0', () => {
    expect(encodeMixing({})).toBe('0')
  })

  it('folds settings in game order and writes base 36, least significant digit first', () => {
    // The last setting is the units digit.
    expect(encodeMixing({ AquaticAsteroidMixing: 1 })).toBe('1')
    // Five settings of range 5 follow DLC5_ID: 5^5 = 3125 = 2 * 36^2 + 14 * 36 + 29.
    expect(encodeMixing({ DLC5_ID: 1 })).toBe('TE2')
  })

  it('reproduces the code of a real save', () => {
    // AQU-C-1393183751-0-0-J5XRH4Y1: Aquatic cluster with Frosty, Bionic and Prehistoric content.
    expect(encodeMixing({ DLC2_ID: 1, DLC3_ID: 1, DLC4_ID: 1 })).toBe('J5XRH4Y1')
  })

  it('writes a level a setting does not have as Disabled', () => {
    expect(encodeMixing({ DLC2_ID: 2 })).toBe('0')
  })
})

describe('decodeMixing', () => {
  it('reads codes back', () => {
    expect(decodeMixing('J5XRH4Y1')).toEqual({ DLC2_ID: 1, DLC3_ID: 1, DLC4_ID: 1 })
    expect(decodeMixing('F5MLLBY1')).toEqual({ DLC2_ID: 1, CeresAsteroidMixing: 2 })
    expect(decodeMixing('0')).toEqual({})
    expect(decodeMixing('!')).toEqual({})
  })

  it('round-trips every level of every setting', () => {
    for (const s of mixingSettings) {
      for (const level of s.levels.filter((l) => l.value > 0)) {
        const levels = { [s.id]: level.value }
        expect(decodeMixing(encodeMixing(levels)), s.id).toEqual(levels)
      }
    }
  })
})

describe('availability', () => {
  it('counts the cluster DLCs and the toggles switched on', () => {
    expect(dlcsInPlay(cluster('V-CER-C'), { DLC4_ID: 1 }).sort()).toEqual(
      ['DLC2_ID', 'DLC4_ID', 'EXPANSION1_ID'].sort(),
    )
    expect(dlcsInPlay(cluster('SNDST-A'), {})).toEqual([])
  })

  it('reads the DLCs a result needs from its coordinate', () => {
    expect(coordinateDlcs('AQU-C', 'AQU-C-1393183751-0-0-J5XRH4Y1').sort()).toEqual(
      ['DLC2_ID', 'DLC3_ID', 'DLC4_ID', 'DLC5_ID', 'EXPANSION1_ID'].sort(),
    )
    expect(coordinateDlcs('SNDST-A', 'SNDST-A-42-0-0-0')).toEqual([])
  })

  it('drops the toggle of a DLC the cluster already needs', () => {
    expect(mixingAvailable(setting('DLC2_ID'), cluster('CER-A'), {})).toBe(false)
    expect(mixingAvailable(setting('DLC2_ID'), cluster('SNDST-A'), {})).toBe(true)
  })

  it('needs the remix DLC in play', () => {
    const base = cluster('SNDST-A')
    expect(mixingAvailable(setting('IceCavesMixing'), base, {})).toBe(false)
    expect(mixingAvailable(setting('IceCavesMixing'), base, { DLC2_ID: 1 })).toBe(true)
  })

  it('keeps asteroid remixes to Spaced Out and off clusters with a forbidden tag', () => {
    const all = { DLC2_ID: 1, DLC4_ID: 1, DLC5_ID: 1 }
    expect(mixingAvailable(setting('CeresAsteroidMixing'), cluster('SNDST-A'), all)).toBe(false)
    expect(mixingAvailable(setting('CeresAsteroidMixing'), cluster('V-SNDST-C'), all)).toBe(true)
    expect(mixingAvailable(setting('CeresAsteroidMixing'), cluster('V-CER-C'), all)).toBe(false)
    expect(mixingAvailable(setting('IceCavesMixing'), cluster('V-CER-C'), all)).toBe(false)
  })

  it('lists what the Mixing tab offers for a cluster', () => {
    const ids = mixingFor(cluster('CER-A')).map((s) => s.id)
    expect(ids).not.toContain('DLC2_ID')
    expect(ids).not.toContain('IceCavesMixing')
    expect(ids).not.toContain('PrehistoricAsteroidMixing')
    expect(ids).toEqual(expect.arrayContaining(['DLC3_ID', 'DLC4_ID', 'GardenMixing']))
  })
})

describe('fitMixing', () => {
  it('drops remixes whose DLC went off, and bad levels', () => {
    const base = cluster('SNDST-A')
    expect(fitMixing(base, { IceCavesMixing: 2 })).toEqual({})
    expect(fitMixing(base, { DLC2_ID: 1, IceCavesMixing: 2, DLC3_ID: 7 })).toEqual({
      DLC2_ID: 1,
      IceCavesMixing: 2,
    })
  })

  it('drops toggles and remixes the new cluster does not take', () => {
    expect(fitMixing(cluster('V-CER-C'), { DLC2_ID: 1, CeresAsteroidMixing: 2 })).toEqual({})
  })
})

describe('guaranteed remixes', () => {
  const biomes = ['IceCavesMixing', 'CarrotQuarryMixing', 'SugarWoodsMixing']
  const prehistoric = ['GardenMixing', 'RaptorMixing', 'WetlandsMixing']
  const seven = Object.fromEntries(
    [...biomes, ...prehistoric, 'BeachMixing'].map((id) => [id, 2] as const),
  )
  const content = { DLC2_ID: 1, DLC4_ID: 1, DLC5_ID: 1 }

  it('counts the room each kind has left', () => {
    expect(guaranteeRoom(cluster('SNDST-A'), {})).toEqual({ world: 0, subworld: 6 })
    expect(guaranteeRoom(cluster('V-SNDST-C'), { CeresAsteroidMixing: 2 })).toEqual({
      world: 5,
      subworld: 14,
    })
  })

  it('blocks a search past the room, as the game blocks the launch', () => {
    const base = cluster('SNDST-A')
    expect(mixingBlocker(base, { ...content, ...seven })).toMatch(/^Biome Remix: .* 6 /)
    expect(mixingBlocker(base, { ...content, IceCavesMixing: 2 })).toBeNull()
  })

  it('lists the fragments an asteroid remix may add', () => {
    expect(remixWorlds(cluster('V-SNDST-C'), { DLC2_ID: 1, CeresAsteroidMixing: 1 })).toEqual([
      'dlc2::worlds/MixingCeresAsteroid',
    ])
    expect(remixWorlds(cluster('SNDST-A'), { DLC2_ID: 1, CeresAsteroidMixing: 1 })).toEqual([])
  })
})
