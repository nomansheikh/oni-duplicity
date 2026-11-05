import { BIONIC, BOTH, DLC3, E1, list, STANDARD, type Options } from './trait-builder.ts'

/**
 * `CONGENITALTRAITS`: each belongs to one named duplicant and is set by the personality, never
 * rolled. `None` is the "no congenital trait" placeholder.
 */
export const congenitalTraits = list('congenital', BOTH, [
  ['None'],
  ['Joshua', { traits: ['ScaredyCat', 'Aggressive'] }],
  ['Ellie', { traits: ['InteriorDecorator', 'MouthBreather', 'Uncultured'] }],
  ['Stinky', { traits: ['Flatulence', 'InteriorDecorator'] }],
  ['Liam', { traits: ['Flatulence', 'InteriorDecorator'] }],
  ['Minnow'],
])

/** `GENESHUFFLERTRAITS`: what the Genetic Ooze machine hands out. */
export const geneticTraits = list('genetic', STANDARD, [
  ['Regeneration'],
  ['DeeperDiversLungs'],
  ['SunnyDisposition'],
  ['RockCrusher'],
])

/** `STRESSTRAITS`, plus `StressShocker` (DLC3), which `TRAITS.cs` defines but no list names. */
export const stressTraits = list('stress', BOTH, [
  ['Aggressive'],
  ['StressVomiter'],
  ['UglyCrier'],
  ['BingeEater'],
  ['Banshee'],
  ['StressShocker', { dlc: DLC3 }],
])

/** `JOYTRAITS`. */
export const joyTraits = list('joy', BOTH, [
  ['BalloonArtist'],
  ['SparkleStreaker'],
  ['StickerBomber'],
  ['SuperProductive'],
  ['HappySinger'],
  ['DataRainer', { dlc: DLC3 }],
  ['RoboDancer', { dlc: DLC3 }],
])

/** `NEEDTRAITS`. */
export const needTraits = list('need', STANDARD, [
  ['Claustrophobic', { rarity: 1 }],
  ['PrefersWarmer', { rarity: 1, traits: ['PrefersColder'] }],
  ['PrefersColder', { rarity: 1, traits: ['PrefersWarmer'] }],
  ['SensitiveFeet', { rarity: 1 }],
  ['Fashionable', { rarity: 1 }],
  ['Climacophobic', { rarity: 1 }],
  ['SolitarySleeper', { rarity: 1 }],
])

/** `BIONICBUGTRAITS` and the `StartWith` booster traits (`BIONICUPGRADETRAITS`). */
export const bionicTraits = list('bionic', BIONIC, [
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
export const specialTraits = list('special', BOTH, [
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
export const otherGrantTraits = list(
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
