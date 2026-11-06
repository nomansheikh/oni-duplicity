export interface TraitExtra {
  id: string
  name: string
  desc: string
}

/**
 * Traits the game defines but the generated catalog misses: the extractor reads the
 * `STRINGS.DUPLICANTS.TRAITS` strings, and these live under other classes or are built at
 * runtime. Names and descriptions are the game's English strings.
 */
export const extraTraits: TraitExtra[] = [
  // STRINGS.DUPLICANTS.CONGENITALTRAITS
  {
    id: 'Joshua',
    name: 'Cheery Disposition',
    desc: "This Duplicant brightens others' days wherever he goes",
  },
  {
    id: 'Ellie',
    name: 'Fastidious',
    desc: 'This Duplicant needs things done in a very particular way',
  },
  { id: 'Liam', name: 'Germaphobe', desc: 'This Duplicant has an all-consuming fear of bacteria' },
  {
    id: 'Stinky',
    name: 'Stinkiness',
    desc: 'This Duplicant is genetically cursed by a pungent bodily odor',
  },
  {
    id: 'Minnow',
    name: 'Freediver',
    desc: 'This Duplicant is practically amphibious\n\n• +4 to all attributes when swimming',
  },
  // STARTWITHBOOSTER_*: named and described after the booster (STRINGS.ITEMS.BIONIC_BOOSTERS)
  {
    id: 'StartWithBooster_Dig1',
    name: 'Digging Booster',
    desc: 'Grants a Bionic Duplicant the skill required to dig hard things.',
  },
  {
    id: 'StartWithBooster_Construct1',
    name: 'Construction Booster',
    desc: 'Grants a Bionic Duplicant the ability to build fast, and demolish buildings that others cannot.',
  },
  {
    id: 'StartWithBooster_Medicine1',
    name: 'Advanced Medical Booster',
    desc: 'Grants a Bionic Duplicant the ability to perform all doctoring errands.',
  },
  {
    id: 'StartWithBooster_Dig2',
    name: 'Extreme Digging Booster',
    desc: 'Grants a Bionic Duplicant the digging skill required to get through anything.',
  },
  {
    id: 'StartWithBooster_Farm1',
    name: 'Crop Tending Booster',
    desc: 'Grants a Bionic Duplicant unparalleled farming and botanical analysis skills.',
  },
  {
    id: 'StartWithBooster_Ranch1',
    name: 'Ranching Booster',
    desc: 'Grants a Bionic Duplicant the skills required to care for Critters in every way.',
  },
  {
    id: 'StartWithBooster_Cook1',
    name: 'Grilling Booster',
    desc: 'Grants a Bionic Duplicant deliciously professional culinary skills.',
  },
  {
    id: 'StartWithBooster_Art1',
    name: 'Masterworks Art Booster',
    desc: 'Grants a Bionic Duplicant flawless decorating skills.',
  },
  {
    id: 'StartWithBooster_Suits1',
    name: 'Suit Training Booster',
    desc: 'Enables a Bionic Duplicant to maximize durability of equipped Exosuits and maintain their runspeed.',
  },
  {
    id: 'StartWithBooster_Op1',
    name: 'Electrical Engineering Booster',
    desc: "Grants a Bionic Duplicant the skills requried to tinker and solder to their heart's content.",
  },
]

/** Catalog IDs the extractor derived wrongly: it title-cased `RoboDancer` into `Robodancer`. */
export const traitIdFixes: Record<string, string> = { Robodancer: 'RoboDancer' }
