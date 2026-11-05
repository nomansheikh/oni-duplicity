/**
 * Duplicant trait metadata: which list the game draws a trait from, its DLC requirement,
 * the traits and interests it excludes, and which duplicant models can carry it.
 *
 * Transcribed by hand from the decompiled game (Kupie/ONI_Decomp):
 * - `TUNING/DUPLICANTSTATS.cs`: `GOODTRAITS`, `BADTRAITS`, `CONGENITALTRAITS`, `STRESSTRAITS`,
 *   `JOYTRAITS`, `GENESHUFFLERTRAITS`, `BIONICBUGTRAITS`, `SPECIALTRAITS`, `NEEDTRAITS`, each
 *   `TraitVal`'s `rarity`, `mutuallyExclusiveTraits`, `mutuallyExclusiveAptitudes`,
 *   `requiredDlcIds` and `doNotGenerateTrait`.
 * - `BionicUpgradeComponentConfig.cs`: `BIONICUPGRADETRAITS` is filled at runtime with a
 *   `StartWith<booster>` trait for every booster created with `isStartingBooster = true`.
 * - `TUNING/TRAITS.cs`: traits the lists above omit (`StressShocker`, `Archaeologist` and the
 *   `GrantSkill_*` traits no list draws from).
 * - `MinionStartingStats.cs`: `GenerateTraits` (a bionic only ever rolls one `BionicBug` and one
 *   `StartWith` booster trait; the other lists are for standard duplicants) and
 *   `AreTraitsMutuallyExclusive` / `AreTraitAndAptitudesExclusive`, which `traitConflicts`
 *   mirrors.
 *
 * The game only checks exclusions while it rolls a new duplicant. `Traits.OnSpawn` loads a
 * save's trait IDs without checking them (see docs/open-questions.md), so these rules guide
 * the editor and never rewrite traits a save already has.
 * `tests/trait-info.test.ts` checks the table; `apps/web/tests/traits.test.ts` checks it
 * against every duplicant in the test saves.
 */

export type TraitCategory =
  | 'positive'
  | 'negative'
  | 'congenital'
  | 'genetic'
  | 'bionic'
  | 'stress'
  | 'joy'
  | 'need'
  | 'special'

/** The prefab of a duplicant model, as `MinionIdentity.model.name` and the object group. */
export type DuplicantModel = 'Minion' | 'BionicMinion'

export interface TraitInfo {
  id: string
  category: TraitCategory
  /** 1 (common) to 5 (legendary); the game rolls traits by rarity. */
  rarity?: number
  /** DLC IDs that must be active for the save (empty: base game). */
  requiredDlcIds: string[]
  /** Trait IDs the game never combines with this one. */
  excludesTraits: string[]
  /** Skill group (interest) IDs this trait cannot be combined with. */
  excludesInterests: string[]
  /** Models that can carry the trait. */
  models: DuplicantModel[]
  /** `doNotGenerateTrait`: the game never rolls it for a new duplicant. */
  notGenerated?: boolean
}

const E1 = 'EXPANSION1_ID'
const DLC2 = 'DLC2_ID'
const DLC3 = 'DLC3_ID'
const DLC5 = 'DLC5_ID'

const STANDARD: DuplicantModel[] = ['Minion']
const BIONIC: DuplicantModel[] = ['BionicMinion']
const BOTH: DuplicantModel[] = ['Minion', 'BionicMinion']

interface Options {
  rarity?: number
  dlc?: string
  traits?: string[]
  interests?: string[]
  models?: DuplicantModel[]
  notGenerated?: boolean
}

function list(
  category: TraitCategory,
  defaultModels: DuplicantModel[],
  entries: [id: string, options?: Options][],
): TraitInfo[] {
  return entries.map(([id, o = {}]) => ({
    id,
    category,
    ...(o.rarity ? { rarity: o.rarity } : {}),
    requiredDlcIds: o.dlc ? [o.dlc] : [],
    excludesTraits: o.traits ?? [],
    excludesInterests: o.interests ?? [],
    models: o.models ?? defaultModels,
    ...(o.notGenerated ? { notGenerated: true } : {}),
  }))
}

// Rarity constants of DUPLICANTSTATS: COMMON 1, UNCOMMON 2, RARE 3, EPIC 4, LEGENDARY 5.

/** `GOODTRAITS`. */
const POSITIVE = list('positive', STANDARD, [
  ['Twinkletoes', { rarity: 4, traits: ['Anemic'] }],
  ['StrongArm', { rarity: 3, traits: ['NoodleArms'] }],
  ['Greasemonkey', { rarity: 2, traits: ['MachineryDown'] }],
  ['DiversLung', { rarity: 4, traits: ['MouthBreather'] }],
  ['IronGut', { rarity: 1 }],
  ['StrongImmuneSystem', { rarity: 1, traits: ['WeakImmuneSystem'] }],
  ['EarlyBird', { rarity: 3, traits: ['NightOwl'] }],
  ['NightOwl', { rarity: 3, traits: ['EarlyBird'] }],
  ['Meteorphile', { rarity: 3 }],
  ['MoleHands', { rarity: 3, traits: ['CantDig', 'DiggingDown'] }],
  ['FastLearner', { rarity: 3, traits: ['SlowLearner', 'CantResearch'] }],
  ['InteriorDecorator', { rarity: 1, traits: ['Uncultured', 'ArtDown'] }],
  ['Uncultured', { rarity: 1, traits: ['InteriorDecorator'], interests: ['Art'] }],
  ['SimpleTastes', { rarity: 2, traits: ['Foodie'] }],
  [
    'Foodie',
    { rarity: 1, traits: ['SimpleTastes', 'CantCook', 'CookingDown'], interests: ['Cooking'] },
  ],
  ['BedsideManner', { rarity: 1, traits: ['Hemophobia', 'CaringDown'] }],
  ['DecorUp', { rarity: 2, traits: ['DecorDown'] }],
  ['Thriver', { rarity: 4 }],
  ['GreenThumb', { rarity: 1, traits: ['BotanistDown'] }],
  ['ConstructionUp', { rarity: 2, traits: ['ConstructionDown', 'CantBuild'] }],
  ['RanchingUp', { rarity: 2, traits: ['RanchingDown'] }],
  ['Loner', { rarity: 4, dlc: E1 }],
  ['StarryEyed', { rarity: 3, dlc: E1 }],
  ['GlowStick', { rarity: 4, dlc: E1 }],
  ['RadiationEater', { rarity: 4, dlc: E1 }],
  ['FrostProof', { rarity: 1, dlc: DLC2 }],
  ['GrantSkill_Mining1', { rarity: 5, traits: ['CantDig'] }],
  ['GrantSkill_Mining2', { rarity: 5, traits: ['CantDig'] }],
  ['GrantSkill_Mining3', { rarity: 5, traits: ['CantDig'] }],
  ['GrantSkill_Farming2', { rarity: 4 }],
  ['GrantSkill_Ranching1', { rarity: 4 }],
  ['GrantSkill_Cooking1', { rarity: 4, traits: ['CantCook'] }],
  ['GrantSkill_Arting1', { rarity: 4, traits: ['Uncultured'] }],
  ['GrantSkill_Arting2', { rarity: 4, traits: ['Uncultured'] }],
  ['GrantSkill_Arting3', { rarity: 4, traits: ['Uncultured'] }],
  ['GrantSkill_Suits1', { rarity: 4 }],
  ['GrantSkill_Technicals2', { rarity: 4 }],
  ['GrantSkill_Engineering1', { rarity: 4 }],
  ['GrantSkill_Basekeeping2', { rarity: 4, traits: ['Anemic'] }],
  ['GrantSkill_Medicine2', { rarity: 4, traits: ['Hemophobia'] }],
  ['GrantSkill_Swimming', { rarity: 4, dlc: DLC5 }],
  ['GrantSkill_Swimming2', { rarity: 4, dlc: DLC5, notGenerated: true }],
])

/** `BADTRAITS`. */
const NEGATIVE = list('negative', STANDARD, [
  ['CantResearch', { rarity: 1, interests: ['Research'] }],
  ['CantDig', { rarity: 4, interests: ['Mining'] }],
  ['CantCook', { rarity: 2, interests: ['Cooking'] }],
  ['CantBuild', { rarity: 4, interests: ['Building'], traits: ['GrantSkill_Engineering1'] }],
  ['Hemophobia', { rarity: 2, interests: ['MedicalAid'] }],
  ['ScaredyCat', { rarity: 2, interests: ['Mining'] }],
  ['ConstructionDown', { rarity: 2, traits: ['ConstructionUp', 'CantBuild'] }],
  ['RanchingDown', { rarity: 1, traits: ['RanchingUp'] }],
  ['CaringDown', { rarity: 1, traits: ['Hemophobia'] }],
  ['BotanistDown', { rarity: 1 }],
  ['ArtDown', { rarity: 1 }],
  ['CookingDown', { rarity: 1, traits: ['Foodie', 'CantCook'] }],
  ['MachineryDown', { rarity: 1 }],
  ['DiggingDown', { rarity: 3, traits: ['MoleHands', 'CantDig'] }],
  ['SlowLearner', { rarity: 3, traits: ['FastLearner', 'CantResearch'] }],
  ['NoodleArms', { rarity: 3 }],
  ['DecorDown', { rarity: 1 }],
  ['Anemic', { rarity: 5 }],
  ['Flatulence', { rarity: 3 }],
  ['IrritableBowel', { rarity: 2 }],
  ['Snorer', { rarity: 3 }],
  ['MouthBreather', { rarity: 5 }],
  ['SmallBladder', { rarity: 2 }],
  ['CalorieBurner', { rarity: 4 }],
  ['WeakImmuneSystem', { rarity: 2 }],
  ['Allergies', { rarity: 3 }],
  ['NightLight', { rarity: 3 }],
  ['Narcolepsy', { rarity: 5 }],
])

/**
 * `CONGENITALTRAITS`: each belongs to one named duplicant and is set by the personality, never
 * rolled. `None` is the "no congenital trait" placeholder.
 */
const CONGENITAL = list('congenital', BOTH, [
  ['None'],
  ['Joshua', { traits: ['ScaredyCat', 'Aggressive'] }],
  ['Ellie', { traits: ['InteriorDecorator', 'MouthBreather', 'Uncultured'] }],
  ['Stinky', { traits: ['Flatulence', 'InteriorDecorator'] }],
  ['Liam', { traits: ['Flatulence', 'InteriorDecorator'] }],
  ['Minnow'],
])

/** `GENESHUFFLERTRAITS`: what the Genetic Ooze machine hands out. */
const GENETIC = list('genetic', STANDARD, [
  ['Regeneration'],
  ['DeeperDiversLungs'],
  ['SunnyDisposition'],
  ['RockCrusher'],
])

/** `STRESSTRAITS`, plus `StressShocker` (DLC3), which `TRAITS.cs` defines but no list names. */
const STRESS = list('stress', BOTH, [
  ['Aggressive'],
  ['StressVomiter'],
  ['UglyCrier'],
  ['BingeEater'],
  ['Banshee'],
  ['StressShocker', { dlc: DLC3 }],
])

/** `JOYTRAITS`. */
const JOY = list('joy', BOTH, [
  ['BalloonArtist'],
  ['SparkleStreaker'],
  ['StickerBomber'],
  ['SuperProductive'],
  ['HappySinger'],
  ['DataRainer', { dlc: DLC3 }],
  ['RoboDancer', { dlc: DLC3 }],
])

/** `NEEDTRAITS`. */
const NEED = list('need', STANDARD, [
  ['Claustrophobic', { rarity: 1 }],
  ['PrefersWarmer', { rarity: 1, traits: ['PrefersColder'] }],
  ['PrefersColder', { rarity: 1, traits: ['PrefersWarmer'] }],
  ['SensitiveFeet', { rarity: 1 }],
  ['Fashionable', { rarity: 1 }],
  ['Climacophobic', { rarity: 1 }],
  ['SolitarySleeper', { rarity: 1 }],
])

/** `BIONICBUGTRAITS` and the `StartWith` booster traits (`BIONICUPGRADETRAITS`). */
const BIONIC_TRAITS = list('bionic', BIONIC, [
  ...[1, 2, 3, 4, 5, 6, 7].map((n): [string, Options] => [`BionicBug${n}`, { dlc: DLC3 }]),
  ...[
    'Dig1',
    'Construct1',
    'Medicine1',
    'Dig2',
    'Farm1',
    'Ranch1',
    'Cook1',
    'Art1',
    'Suits1',
    'Op1',
  ].map((booster): [string, Options] => [`StartWithBooster_${booster}`, { dlc: DLC3 }]),
])

/**
 * `SPECIALTRAITS` (`AncientKnowledge`, `Chatty`) and `Archaeologist` from `TRAITS.cs`. All three
 * are `doNotGenerateTrait` or unlisted: the game assigns them by other means.
 */
const SPECIAL = list('special', BOTH, [
  [
    'AncientKnowledge',
    {
      rarity: 5,
      dlc: E1,
      notGenerated: true,
      traits: [
        'CantResearch',
        'CantBuild',
        'CantCook',
        'CantDig',
        'Hemophobia',
        'ScaredyCat',
        'Anemic',
        'SlowLearner',
        'NoodleArms',
        'ConstructionDown',
        'RanchingDown',
        'DiggingDown',
        'MachineryDown',
        'CookingDown',
        'ArtDown',
        'CaringDown',
        'BotanistDown',
      ],
    },
  ],
  ['Chatty', { rarity: 5, notGenerated: true }],
  ['Archaeologist'],
])

/**
 * `GrantSkill_*` traits `TRAITS.cs` defines that `GOODTRAITS` does not roll. They grant a
 * standard-duplicant skill.
 */
const OTHER_GRANTS = list(
  'special',
  STANDARD,
  [
    'Mining4',
    'Building1',
    'Building2',
    'Building3',
    'Farming1',
    'Farming3',
    'Ranching2',
    'Researching1',
    'Researching2',
    'Researching3',
    'Researching4',
    'Cooking2',
    'Hauling1',
    'Hauling2',
    'Technicals1',
    'Basekeeping1',
    'Astronauting1',
    'Astronauting2',
    'Medicine1',
    'Medicine3',
    'Pyrotechnics',
  ].map((skill): [string, Options] => [`GrantSkill_${skill}`, { notGenerated: true }]),
)

export const traitInfo: TraitInfo[] = [
  ...POSITIVE,
  ...NEGATIVE,
  ...CONGENITAL,
  ...GENETIC,
  ...STRESS,
  ...JOY,
  ...NEED,
  ...BIONIC_TRAITS,
  ...SPECIAL,
  ...OTHER_GRANTS,
]

const byId = new Map(traitInfo.map((t) => [t.id.toLowerCase(), t]))

/** Metadata for a trait ID, ignoring case; `undefined` for a trait the table doesn't cover. */
export const findTraitInfo = (id: string): TraitInfo | undefined => byId.get(id.toLowerCase())

/**
 * Trait IDs the game's string tables name but no code defines as a `Trait`, so the game skips
 * them when loading a save (`Db.traits.Exists` is false). The editor does not offer them.
 */
export const inertTraitIds: readonly string[] = ['Anxious', 'Fussy']

/** The person-facing category label. */
export const traitCategoryLabels: Record<TraitCategory, string> = {
  positive: 'Positive',
  negative: 'Negative',
  congenital: 'Congenital',
  genetic: 'Genetic',
  bionic: 'Bionic',
  stress: 'Stress response',
  joy: 'Overjoyed response',
  need: 'Need',
  special: 'Special',
}

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

// --- Rules -------------------------------------------------------------------------

export interface TraitConflict {
  kind: 'trait' | 'interest'
  /** The trait ID or skill group ID in the way. */
  id: string
}

/**
 * What stops a trait being added next to the traits and interests a duplicant has. Mirrors
 * `MinionStartingStats.AreTraitsMutuallyExclusive` (a pair conflicts when either side lists the
 * other) and `AreTraitAndAptitudesExclusive` (the new trait lists an interest the duplicant has).
 * Interests compare case-insensitively: the catalog spells Research as `research`.
 */
export function traitConflicts(
  traitId: string,
  heldTraitIds: readonly string[],
  activeInterestIds: readonly string[],
): TraitConflict[] {
  const info = findTraitInfo(traitId)
  const id = traitId.toLowerCase()
  const conflicts: TraitConflict[] = []
  for (const held of heldTraitIds) {
    if (held.toLowerCase() === id) continue
    const heldInfo = findTraitInfo(held)
    const clash =
      info?.excludesTraits.some((t) => t.toLowerCase() === held.toLowerCase()) ||
      heldInfo?.excludesTraits.some((t) => t.toLowerCase() === id)
    if (clash) conflicts.push({ kind: 'trait', id: held })
  }
  const active = new Set(activeInterestIds.map((i) => i.toLowerCase()))
  for (const interest of info?.excludesInterests ?? []) {
    if (active.has(interest.toLowerCase())) conflicts.push({ kind: 'interest', id: interest })
  }
  return conflicts
}

export type TraitUnavailable = 'inert' | 'model' | 'dlc'

/**
 * Whether a save's duplicant can take the trait: the game skips traits whose DLC is off
 * (`Game.IsCorrectDlcActiveForCurrentSave`), and a model only carries its own lists.
 * Traits missing from the table are allowed.
 */
export function traitUnavailable(
  traitId: string,
  model: DuplicantModel,
  activeDlcIds: readonly string[],
): TraitUnavailable | undefined {
  if (inertTraitIds.some((t) => t.toLowerCase() === traitId.toLowerCase())) return 'inert'
  const info = findTraitInfo(traitId)
  if (!info) return undefined
  if (!info.models.includes(model)) return 'model'
  if (!info.requiredDlcIds.every((d) => activeDlcIds.includes(d))) return 'dlc'
  return undefined
}
