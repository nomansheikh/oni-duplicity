import { expect, test } from 'vite-plus/test'
import {
  baseGameName,
  findWorldgenCluster,
  findWorldgenTrait,
  mixingSections,
  mixingSettings,
  worldgenDlcs,
} from '../src/index.ts'

test('DLCs come in the game order with their names', () => {
  expect(baseGameName).toBe('Base Game')
  expect(worldgenDlcs.map((dlc) => dlc.id)).toEqual([
    'EXPANSION1_ID',
    'DLC2_ID',
    'DLC3_ID',
    'DLC4_ID',
    'DLC5_ID',
  ])
  for (const dlc of worldgenDlcs) {
    expect(dlc.name, dlc.id).not.toMatch(/^STRINGS\./)
    expect(dlc.color, dlc.id).toMatch(/^#[0-9a-f]{6}$/)
  }
})

test('mixing settings follow the CustomMixingSettingsConfigs registration order', () => {
  expect(mixingSettings.map((s) => s.id)).toEqual([
    ...['DLC2_ID', 'IceCavesMixing', 'CarrotQuarryMixing', 'SugarWoodsMixing'],
    ...['CeresAsteroidMixing', 'DLC3_ID', 'DLC4_ID', 'GardenMixing', 'RaptorMixing'],
    ...['WetlandsMixing', 'PrehistoricAsteroidMixing', 'DLC5_ID', 'BeachMixing', 'ReefMixing'],
    ...['KelpForestMixing', 'AbyssMixing', 'AquaticAsteroidMixing'],
  ])
})

test('DLC toggles are Disabled or Enabled; remixes add Likely and Guaranteed', () => {
  for (const setting of mixingSettings) {
    expect(setting.range, setting.id).toBe(5)
    expect(setting.name, setting.id).not.toMatch(/^STRINGS\./)
    const levels = setting.levels.map((level) => `${level.id}=${level.value}`)
    expect(levels, setting.id).toEqual(
      setting.kind === 'dlc'
        ? ['Disabled=0', 'Enabled=1']
        : ['Disabled=0', 'TryMixing=1', 'GuranteeMixing=2'],
    )
  }
})

test('remixes carry their DLC, forbidden cluster tags and fragment world', () => {
  expect(mixingSettings.find((s) => s.id === 'CeresAsteroidMixing')).toMatchObject({
    kind: 'world',
    requiredDlcIds: ['DLC2_ID'],
    forbiddenClusterTags: ['CeresCluster'],
    world: 'dlc2::worlds/MixingCeresAsteroid',
  })
  expect(mixingSettings.find((s) => s.id === 'ReefMixing')).toMatchObject({
    kind: 'subworld',
    requiredDlcIds: ['DLC5_ID'],
    forbiddenClusterTags: ['AquaticCluster'],
  })
})

test('the Mixing tab sections use the game headers', () => {
  expect(mixingSections.map((s) => [s.kind, s.title])).toEqual([
    ['dlc', 'DLC Content'],
    ['world', 'Asteroid Remix'],
    ['subworld', 'Biome Remix'],
  ])
  for (const section of mixingSections) expect(section.desc).not.toMatch(/^STRINGS\./)
})

test('clusters carry their tags and which placements take an asteroid remix', () => {
  expect(findWorldgenCluster('CER-A')?.tags).toContain('CeresCluster')
  expect(findWorldgenCluster('V-SNDST-C')?.worlds.filter((w) => w.mixing)).toHaveLength(6)
  expect(findWorldgenCluster('SNDST-A')?.worlds.some((w) => w.mixing)).toBe(false)
})

test('a trait needs the DLC whose folder holds it', () => {
  expect(findWorldgenTrait('traits/MetalRich')?.requiredDlcIds).toEqual([])
  expect(findWorldgenTrait('expansion1::traits/Volcanoes')?.requiredDlcIds).toEqual([
    'EXPANSION1_ID',
  ])
})
