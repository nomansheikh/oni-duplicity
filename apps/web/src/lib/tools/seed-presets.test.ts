import { geyserTypes, worldgenTraits } from '@oni-duplicity/game-data'
import { describe, expect, it } from 'vite-plus/test'
import { SEED_CLUSTERS, clusterByPrefix } from '@/seed/clusters'
import { dlcsInPlay } from '@/seed/mixing'
import { SEED_PRESETS } from '@/seed/presets'
import { emptyState, patchRule } from './seed-builder'
import { loadPreset, presetFits, presetNeeds, presetStatus } from './seed-presets'

const preset = (id: string) => SEED_PRESETS.find((p) => p.id === id)!
const dlcsOf = (prefix: string, mixing = {}) => dlcsInPlay(clusterByPrefix(prefix)!, mixing)
const loaded = (prefix: string, id: string) =>
  loadPreset(emptyState(prefix), preset(id), dlcsOf(prefix))

describe('presets', () => {
  it('use only extracted geyser and trait ids', () => {
    const geysers = new Set([...geyserTypes.map((t) => t.id), 'OilWell'])
    const traits = new Set(worldgenTraits.map((t) => t.id))
    for (const p of SEED_PRESETS) {
      expect(p.description, p.id).toBeTruthy()
      for (const rule of p.rules) {
        if (rule.kind === 'geyser') expect(geysers, p.id).toContain(rule.geyser)
        if (rule.kind === 'trait') expect(traits, p.id).toContain(rule.trait)
      }
    }
  })

  it('need the DLCs their geysers and traits come from', () => {
    expect(presetNeeds(preset('easy-start'))).toEqual([])
    // Subsurface Ocean has a base-game copy, so the preset runs anywhere.
    expect(presetNeeds(preset('lots-of-water'))).toEqual([])
    expect(presetNeeds(preset('rare-metals'))).toEqual(['EXPANSION1_ID'])
    expect(presetNeeds(preset('radioactive'))).toEqual(['EXPANSION1_ID'])
    expect(presetNeeds(preset('polluted-brine'))).toEqual(['DLC5_ID'])
  })

  it('keep every rule wherever they fit', () => {
    for (const cluster of SEED_CLUSTERS) {
      const dlcs = dlcsInPlay(cluster, {})
      for (const p of SEED_PRESETS.filter((candidate) => presetFits(candidate, dlcs))) {
        const rules = loadPreset(emptyState(cluster.prefix), p, dlcs).rules
        expect(rules.length, `${p.id} on ${cluster.prefix}`).toBe(p.rules.length)
      }
    }
  })

  it('fit the clusters and mixing whose DLCs they need', () => {
    expect(presetFits(preset('rare-metals'), dlcsOf('SNDST-A'))).toBe(false)
    expect(presetFits(preset('rare-metals'), dlcsOf('V-SNDST-C'))).toBe(true)
    expect(presetFits(preset('polluted-brine'), dlcsOf('SNDST-A'))).toBe(false)
    expect(presetFits(preset('polluted-brine'), dlcsOf('SNDST-A', { DLC5_ID: 1 }))).toBe(true)
  })
})

describe('presetStatus', () => {
  it('is null without a preset', () => {
    expect(presetStatus(emptyState('SNDST-A'), [])).toBeNull()
  })

  it('shows a freshly loaded preset as is, also after its traits swap copies', () => {
    const state = loaded('SNDST-A', 'lots-of-water')
    expect(state.rules.at(-1)).toMatchObject({ trait: 'traits/SubsurfaceOcean' })
    expect(presetStatus(state, dlcsOf('SNDST-A'))).toMatchObject({
      preset: { id: 'lots-of-water' },
      edited: false,
    })
  })

  it('marks the preset edited once a rule changes, and not once it is changed back', () => {
    const state = loaded('SNDST-A', 'power')
    const edited = patchRule(state, 'methane', { weight: 9 })
    expect(presetStatus(edited, [])?.edited).toBe(true)
    expect(presetStatus(patchRule(edited, 'methane', { weight: 3 }), [])?.edited).toBe(false)
  })

  it('marks the preset edited when the DLCs in play can no longer run it', () => {
    const state = { ...loaded('V-SNDST-C', 'rare-metals'), cluster: 'SNDST-A' }
    expect(presetStatus(state, dlcsOf('SNDST-A'))?.edited).toBe(true)
  })
})
