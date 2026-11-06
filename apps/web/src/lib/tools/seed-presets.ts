import { geyserTypes, worldgenTraits } from '@oni-duplicity/game-data'
import { SEED_PRESETS } from '@/seed/presets'
import type { SeedPreset, SeedRule } from '@/seed/rules'
import { applyPreset, emptyState, fitToDlcs, type BuilderState } from './seed-builder'
import { availableIds } from './seed-catalog'

/** A trait id without its DLC folder: `expansion1::traits/Volcanoes` gives `traits/Volcanoes`. */
const traitPath = (id: string) => id.replace(/^\w+::/, '')

/**
 * The DLCs a rule's target needs. A trait with a copy in the base game's folder needs none,
 * since loading the preset swaps in whichever copy the DLCs in play report.
 */
function ruleDlcs(rule: SeedRule): string[] {
  if (rule.kind === 'geyser') {
    return geyserTypes.find((type) => type.id === rule.geyser)?.requiredDlcIds ?? []
  }
  if (rule.kind !== 'trait') return []
  const copies = worldgenTraits.filter((trait) => traitPath(trait.id) === traitPath(rule.trait))
  const easiest = copies.find((trait) => trait.requiredDlcIds.length === 0) ?? copies[0]
  return easiest?.requiredDlcIds ?? []
}

/** The DLCs a preset needs: every DLC one of its geysers or traits comes from. */
export function presetNeeds(preset: SeedPreset): string[] {
  return [...new Set(preset.rules.flatMap(ruleDlcs))]
}

/** Whether every rule of the preset can match with these DLCs in play. */
export function presetFits(preset: SeedPreset, dlcs: readonly string[]): boolean {
  return presetNeeds(preset).every((id) => dlcs.includes(id))
}

/** Loads a preset into a state and fits its rules to the DLCs in play, as the picker does. */
export function loadPreset(
  state: BuilderState,
  preset: SeedPreset,
  dlcs: readonly string[],
): BuilderState {
  return fitToDlcs(applyPreset(state, preset), availableIds(dlcs))
}

export interface PresetStatus {
  preset: SeedPreset
  /** The rows no longer match the preset: a rule changed, or the DLCs in play cannot run it. */
  edited: boolean
}

/** The preset the rows came from and whether they still match it, or null for no preset. */
export function presetStatus(state: BuilderState, dlcs: readonly string[]): PresetStatus | null {
  const preset = SEED_PRESETS.find((candidate) => candidate.id === state.presetId)
  if (!preset) return null
  const loaded = loadPreset(emptyState(state.cluster), preset, dlcs).rules
  const same = presetFits(preset, dlcs) && JSON.stringify(state.rules) === JSON.stringify(loaded)
  return { preset, edited: !same }
}
