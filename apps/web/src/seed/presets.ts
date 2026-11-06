import type { GeyserRule, RuleScope, SeedPreset, TraitRule } from './rules.ts'

/**
 * Starter rule lists. Geyser ids are `id`s from `geyserTypes` in
 * `packages/game-data/src/geyser-types.ts` (`OilWell` is the oil reservoir entity). Trait ids are
 * the ones the bundled worldgen (`@onimaxxing/worldgen` 0.33.4) reports for generated asteroids,
 * collected over 125 sampled Spaced Out and base-game-layout seeds.
 */

const start: RuleScope = { kind: 'start' }
const anywhere: RuleScope = { kind: 'anywhere' }

const geyser = (
  id: string,
  type: string,
  scope: RuleScope,
  min: number,
  mode: 'must' | 'nice',
  weight = 1,
): GeyserRule => ({ id, kind: 'geyser', geyser: type, scope, min, mode, weight })

const trait = (
  id: string,
  name: string,
  presence: 'has' | 'lacks',
  scope: RuleScope,
  mode: 'must' | 'nice',
  weight = 1,
): TraitRule => ({ id, kind: 'trait', trait: name, presence, scope, mode, weight })

export const SEED_PRESETS: SeedPreset[] = [
  {
    id: 'easy-start',
    name: 'Easy start',
    description:
      'A start asteroid without a misaligned start, with water and steam geysers and metal close by.',
    rules: [
      trait('no-misaligned', 'traits/MisalignedStart', 'lacks', start, 'must'),
      trait('no-geo-dormant', 'traits/GeoDormant', 'lacks', start, 'must'),
      geyser('start-hot-water', 'hot_water', start, 1, 'nice', 4),
      geyser('start-salt-water', 'salt_water', start, 1, 'nice', 2),
      geyser('start-steam', 'steam', start, 1, 'nice', 3),
      trait('start-metal-rich', 'traits/MetalRich', 'has', start, 'nice', 3),
      trait('start-no-metal-poor', 'traits/MetalPoor', 'lacks', start, 'nice', 2),
    ],
  },
  {
    id: 'lots-of-water',
    name: 'Lots of water',
    description:
      'At least two clean-water geysers in the cluster, with salt water and oceans as a bonus.',
    rules: [
      geyser('hot-water-2', 'hot_water', anywhere, 2, 'must'),
      geyser('hot-water-4', 'hot_water', anywhere, 4, 'nice', 3),
      geyser('salt-water', 'salt_water', anywhere, 2, 'nice', 2),
      geyser('slush-water', 'slush_water', anywhere, 1, 'nice', 1),
      trait('subsurface-ocean', 'expansion1::traits/SubsurfaceOcean', 'has', anywhere, 'nice', 2),
    ],
  },
  {
    id: 'metal-rich',
    name: 'Metal rich',
    description: 'A metal-rich start and molten metal geysers to farm.',
    rules: [
      trait('start-metal-rich', 'traits/MetalRich', 'has', start, 'must'),
      geyser('molten-iron', 'molten_iron', anywhere, 1, 'nice', 2),
      geyser('molten-copper', 'molten_copper', anywhere, 1, 'nice', 2),
      geyser('molten-gold', 'molten_gold', anywhere, 1, 'nice', 2),
      trait('metal-caves', 'expansion1::traits/MetalCaves', 'has', anywhere, 'nice', 2),
    ],
  },
  {
    id: 'oil-and-gas',
    name: 'Oil and gas',
    description: 'Oil reservoirs and natural gas for plastic and power.',
    rules: [
      geyser('oil-wells', 'OilWell', anywhere, 3, 'must'),
      geyser('methane', 'methane', anywhere, 1, 'nice', 3),
      geyser('oil-wells-6', 'OilWell', anywhere, 6, 'nice', 2),
      trait('irregular-oil', 'expansion1::traits/IrregularOil', 'has', anywhere, 'nice', 1),
    ],
  },
]
