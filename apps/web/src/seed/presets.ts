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

const hasTrait = (id: string, name: string, scope: RuleScope, weight: number) =>
  trait(id, name, 'has', scope, 'nice', weight)

/** Every boulder trait, for starts without boulders to dig through. */
const BOULDERS = ['BouldersLarge', 'BouldersMedium', 'BouldersMixed', 'BouldersSmall']

/**
 * In picker order: the ones any cluster can run, then Spaced Out, then planet packs. A preset
 * whose geysers or traits need a DLC that is not in play is disabled in the picker.
 */
export const SEED_PRESETS: SeedPreset[] = [
  {
    id: 'easy-start',
    name: 'Easy start',
    description:
      'A start asteroid with water, steam and metal close by, and the pod in the center.',
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
    id: 'no-hassle',
    name: 'No-hassle start',
    description: 'A start asteroid without boulders, a frozen core or slime, and the pod centered.',
    rules: [
      ...BOULDERS.map((name) =>
        trait(`no-${name.toLowerCase()}`, `traits/${name}`, 'lacks', start, 'must'),
      ),
      trait('no-frozen-core', 'traits/FrozenCore', 'lacks', start, 'must'),
      trait('no-misaligned', 'traits/MisalignedStart', 'lacks', start, 'must'),
      trait('no-slime', 'traits/SlimeSplats', 'lacks', start, 'nice', 2),
      trait('no-geo-dormant', 'traits/GeoDormant', 'lacks', start, 'nice', 1),
    ],
  },
  {
    id: 'cool-start',
    name: 'Cool start',
    description: 'Cool steam, cool slush and polluted water vents on the start asteroid.',
    rules: [
      geyser('start-steam', 'steam', start, 1, 'nice', 3),
      geyser('start-slush-water', 'slush_water', start, 1, 'nice', 2),
      geyser('start-filthy-water', 'filthy_water', start, 1, 'nice', 2),
    ],
  },
  {
    id: 'lots-of-water',
    name: 'Lots of water',
    description: 'Two or more water geysers, with salt water and a subsurface ocean as a bonus.',
    rules: [
      geyser('hot-water-2', 'hot_water', anywhere, 2, 'must'),
      geyser('hot-water-4', 'hot_water', anywhere, 4, 'nice', 3),
      geyser('salt-water', 'salt_water', anywhere, 2, 'nice', 2),
      geyser('slush-water', 'slush_water', anywhere, 1, 'nice', 1),
      hasTrait('subsurface-ocean', 'expansion1::traits/SubsurfaceOcean', anywhere, 2),
    ],
  },
  {
    id: 'power',
    name: 'Power',
    description: 'Natural gas, hydrogen and steam vents, with oil, to run generators.',
    rules: [
      geyser('methane', 'methane', anywhere, 1, 'nice', 3),
      geyser('hot-hydrogen', 'hot_hydrogen', anywhere, 1, 'nice', 3),
      geyser('hot-steam', 'hot_steam', anywhere, 1, 'nice', 2),
      geyser('oil-wells', 'OilWell', anywhere, 3, 'nice', 1),
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
      hasTrait('irregular-oil', 'expansion1::traits/IrregularOil', anywhere, 1),
    ],
  },
  {
    id: 'metal-rich',
    name: 'Metal rich',
    description: 'A metal-rich start and iron, copper and gold volcanoes to tame.',
    rules: [
      trait('start-metal-rich', 'traits/MetalRich', 'has', start, 'must'),
      geyser('molten-iron', 'molten_iron', anywhere, 1, 'nice', 2),
      geyser('molten-copper', 'molten_copper', anywhere, 1, 'nice', 2),
      geyser('molten-gold', 'molten_gold', anywhere, 1, 'nice', 2),
    ],
  },
  {
    id: 'rare-metals',
    name: 'Rare metals',
    description: 'Niobium, tungsten, aluminum and cobalt volcanoes, and metallic caves.',
    rules: [
      geyser('molten-niobium', 'molten_niobium', anywhere, 1, 'nice', 3),
      geyser('molten-tungsten', 'molten_tungsten', anywhere, 1, 'nice', 3),
      geyser('molten-aluminum', 'molten_aluminum', anywhere, 1, 'nice', 2),
      geyser('molten-cobalt', 'molten_cobalt', anywhere, 1, 'nice', 2),
      hasTrait('metal-caves', 'expansion1::traits/MetalCaves', anywhere, 2),
    ],
  },
  {
    id: 'radioactive',
    name: 'Radioactive',
    description: 'A radioactive crust and crashed satellites for radbolts and nuclear power.',
    rules: [
      hasTrait('radioactive-crust', 'expansion1::traits/RadioactiveCrust', anywhere, 3),
      hasTrait('crashed-satellites', 'expansion1::traits/CrashedSatellites', anywhere, 2),
      geyser('liquid-sulfur', 'liquid_sulfur', anywhere, 1, 'nice', 1),
    ],
  },
  {
    id: 'polluted-brine',
    name: 'Polluted brine',
    description: 'Polluted brine vents, with salt water geysers beside them.',
    rules: [
      geyser('murky-brine', 'murky_brine', anywhere, 1, 'nice', 3),
      geyser('salt-water', 'salt_water', anywhere, 1, 'nice', 2),
    ],
  },
]
