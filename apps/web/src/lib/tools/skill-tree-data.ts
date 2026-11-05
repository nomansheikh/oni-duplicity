// ONI duplicant skill tree, extracted from the decompiled game (Assembly-CSharp).
// Every number is read from the cited file; nothing comes from the wiki or memory.
// Paths below are relative to the decompile root ONI_Decomp/Assembly-CSharp/.
// "variant" fields cover content that depends on which DLCs are active (see notes).

export interface SkillPerkEntry {
  /** SkillPerk id string as passed to the perk constructor in Database/SkillPerks.cs (trimmed) */
  id: string
  /** description text from STRINGS/UI.cs ROLES_SCREEN.PERKS.*.DESCRIPTION (building names resolved from STRINGS/BUILDINGS.cs) */
  text?: string
  /** Attributes.* id (Database/Attributes.cs) for SkillAttributePerk */
  attribute?: string
  /** SkillAttributePerk amount (ROLES.ATTRIBUTE_BONUS_FIRST/SECOND/THIRD are all 2 in TUNING/ROLES.cs) */
  amount?: number
  /** extra condition under which Skills.cs / SkillPerks.cs adds or enables this perk */
  condition?: string
}

export interface SkillNode {
  /** Skill id exactly as MinionResume.MasteryBySkillID stores it (Database/Skills.cs first constructor arg) */
  id: string
  /** DUPLICANTS.ROLES.*.NAME (STRINGS/DUPLICANTS.cs) with link markup removed */
  name: string
  /** SkillGroup id (Database/SkillGroups.cs) */
  group: string
  /** Skill `tier` constructor arg (Database/Skills.cs) */
  tier: number
  /** priorSkills list (skill ids); all must be mastered (MinionResume.HasMasteredDirectlyRequiredSkillsForSkill) */
  prerequisites: string[]
  /** priorSkills when EXPANSION1_ID is active, only where it differs from `prerequisites` */
  prerequisitesWithExpansion1?: string[]
  /** requiredDuplicantModel constructor arg: 'Minion' (GameTags.Minions.Models.Standard) or 'BionicMinion' (GameTags.Minions.Models.Bionic, GameTags.cs) */
  model?: string
  /** requiredDlcIds constructor arg (Database/Skill.cs) */
  dlcIds?: string[]
  /** perks granted (Database/SkillPerks.cs); SkillAttributePerk entries list attribute + amount */
  perks: SkillPerkEntry[]
  /** morale expectation this skill adds when learned: Skill.GetMoraleExpectation / MinionResume.UpdateExpectations = tier + 1 */
  moraleExpectation: number
  /** Skill.hat constructor arg */
  hat: string
  /** variant / availability remarks taken from Database/Skills.cs */
  notes?: string
  cite: string
}

export const skillNodes: SkillNode[] = [
  {
    id: 'Mining1',
    name: 'Hard Digging',
    group: 'Mining',
    tier: 0,
    prerequisites: [],
    model: 'Minion',
    perks: [
      { id: 'IncreaseDigSpeedSmall', attribute: 'Digging', amount: 2 },
      { id: 'CanDigVeryFirm', text: 'Very Firm Material Mining' },
    ],
    moraleExpectation: 1,
    hat: 'hat_role_mining1',
    cite: 'Database/Skills.cs: Skill("Mining1", DUPLICANTS.ROLES.JUNIOR_MINER.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Mining2',
    name: 'Superhard Digging',
    group: 'Mining',
    tier: 1,
    prerequisites: ['Mining1'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseDigSpeedMedium', attribute: 'Digging', amount: 2 },
      { id: 'CanDigAbyssalite', text: 'Abyssalite Mining' },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_mining2',
    cite: 'Database/Skills.cs: Skill("Mining2", DUPLICANTS.ROLES.MINER.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Mining3',
    name: 'Super-Duperhard Digging',
    group: 'Mining',
    tier: 2,
    prerequisites: ['Mining2'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseDigSpeedLarge', attribute: 'Digging', amount: 2 },
      { id: 'CanDigDiamondAndObsidan', text: 'Diamond and Obsidian Mining' },
    ],
    moraleExpectation: 3,
    hat: 'hat_role_mining3',
    cite: 'Database/Skills.cs: Skill("Mining3", DUPLICANTS.ROLES.SENIOR_MINER.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Mining4',
    name: 'Hazmat Digging',
    group: 'Mining',
    tier: 3,
    prerequisites: ['Mining3'],
    model: 'Minion',
    dlcIds: ['EXPANSION1_ID'],
    perks: [{ id: 'CanDigCorium', text: 'Corium Mining' }],
    moraleExpectation: 4,
    hat: 'hat_role_mining4',
    cite: 'Database/Skills.cs: Skill("Mining4", DUPLICANTS.ROLES.MASTER_MINER.NAME, ..., tier 3); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Building1',
    name: 'Improved Construction I',
    group: 'Building',
    tier: 0,
    prerequisites: [],
    model: 'Minion',
    perks: [{ id: 'IncreaseConstructionSmall', attribute: 'Construction', amount: 2 }],
    moraleExpectation: 1,
    hat: 'hat_role_building1',
    cite: 'Database/Skills.cs: Skill("Building1", DUPLICANTS.ROLES.JUNIOR_BUILDER.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Building2',
    name: 'Improved Construction II',
    group: 'Building',
    tier: 1,
    prerequisites: ['Building1'],
    model: 'Minion',
    perks: [{ id: 'IncreaseConstructionMedium', attribute: 'Construction', amount: 2 }],
    moraleExpectation: 2,
    hat: 'hat_role_building2',
    cite: 'Database/Skills.cs: Skill("Building2", DUPLICANTS.ROLES.BUILDER.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Building3',
    name: 'Demolition',
    group: 'Building',
    tier: 2,
    prerequisites: ['Building2'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseConstructionLarge', attribute: 'Construction', amount: 2 },
      { id: 'CanDemonlish', text: 'Demolish Gravitas Buildings' },
    ],
    moraleExpectation: 3,
    hat: 'hat_role_building3',
    cite: 'Database/Skills.cs: Skill("Building3", DUPLICANTS.ROLES.SENIOR_BUILDER.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Farming1',
    name: 'Improved Farming I',
    group: 'Farming',
    tier: 0,
    prerequisites: [],
    model: 'Minion',
    perks: [
      { id: 'IncreaseBotanySmall', attribute: 'Botanist', amount: 2 },
      {
        id: 'CanFarmClams',
        text: 'Clampum farming',
        condition:
          'DLC5_ID subscribed (Skills.cs: DlcManager.IsContentSubscribed("DLC5_ID") branch for Farming1)',
      },
    ],
    moraleExpectation: 1,
    hat: 'hat_role_farming1',
    cite: 'Database/Skills.cs: Skill("Farming1", DUPLICANTS.ROLES.JUNIOR_FARMER.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Farming2',
    name: 'Crop Tending',
    group: 'Farming',
    tier: 1,
    prerequisites: ['Farming1'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseBotanyMedium', attribute: 'Botanist', amount: 2 },
      { id: 'CanFarmTinker', text: 'Crop Tending' },
      { id: 'CanFarmStation', text: 'Can craft Micronutrient Fertilizer at the Farm Station' },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_farming2',
    cite: 'Database/Skills.cs: Skill("Farming2", DUPLICANTS.ROLES.FARMER.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Farming3',
    name: 'Improved Farming II',
    group: 'Farming',
    tier: 2,
    prerequisites: ['Farming2'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseBotanyLarge', attribute: 'Botanist', amount: 2 },
      { id: 'CanSalvagePlantFiber', text: 'Can salvage Plant Fiber' },
      {
        id: 'CanIdentifyMutantSeeds',
        text: 'Can identify Mutant Seeds at the Botanical Analyzer',
        condition:
          'EXPANSION1_ID active (Skills.cs: DlcManager.FeaturePlantMutationsEnabled() => IsExpansion1Active)',
      },
    ],
    moraleExpectation: 3,
    hat: 'hat_role_farming3',
    cite: 'Database/Skills.cs: Skill("Farming3", DUPLICANTS.ROLES.SENIOR_FARMER.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Ranching1',
    name: 'Critter Ranching I',
    group: 'Ranching',
    tier: 1,
    prerequisites: ['Farming1'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseRanchingSmall', attribute: 'Ranching', amount: 2 },
      { id: 'CanUseRanchStation', text: 'Grooming Station Usage' },
      { id: 'CanWrangleCreatures', text: 'Critter Wrangling' },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_rancher1',
    cite: 'Database/Skills.cs: Skill("Ranching1", DUPLICANTS.ROLES.RANCHER.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Ranching2',
    name: 'Critter Ranching II',
    group: 'Ranching',
    tier: 2,
    prerequisites: ['Ranching1'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseRanchingMedium', attribute: 'Ranching', amount: 2 },
      { id: 'CanUseMilkingStation', text: 'Milking Station Usage' },
    ],
    moraleExpectation: 3,
    hat: 'hat_role_rancher2',
    cite: 'Database/Skills.cs: Skill("Ranching2", DUPLICANTS.ROLES.SENIOR_RANCHER.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Researching1',
    name: 'Advanced Research',
    group: 'Research',
    tier: 0,
    prerequisites: [],
    model: 'Minion',
    perks: [
      { id: 'IncreaseLearningSmall', attribute: 'Learning', amount: 2 },
      { id: 'AllowAdvancedResearch', text: 'Super Computer Usage' },
      { id: 'AllowChemistry', text: 'Emulsifier Usage' },
    ],
    moraleExpectation: 1,
    hat: 'hat_role_research1',
    cite: 'Database/Skills.cs: Skill("Researching1", DUPLICANTS.ROLES.JUNIOR_RESEARCHER.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Researching2',
    name: 'Field Research',
    group: 'Research',
    tier: 1,
    prerequisites: ['Researching1'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseLearningMedium', attribute: 'Learning', amount: 2 },
      { id: 'CanStudyWorldObjects', text: 'Geographical Analysis' },
      { id: 'AllowGeyserTuning', text: 'Geotuner Usage' },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_research2',
    cite: 'Database/Skills.cs: Skill("Researching2", DUPLICANTS.ROLES.RESEARCHER.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'AtomicResearch',
    name: 'Applied Sciences Research',
    group: 'Research',
    tier: 2,
    prerequisites: ['Researching2'],
    model: 'Minion',
    dlcIds: ['EXPANSION1_ID'],
    perks: [
      { id: 'IncreaseLearningLarge', attribute: 'Learning', amount: 2 },
      { id: 'AllowNuclearResearch', text: 'Materials Study Terminal Usage' },
    ],
    moraleExpectation: 3,
    hat: 'hat_role_research5',
    cite: 'Database/Skills.cs: Skill("AtomicResearch", DUPLICANTS.ROLES.NUCLEAR_RESEARCHER.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Researching3',
    name: 'Astronomy',
    group: 'Research',
    tier: 2,
    prerequisites: ['Researching2'],
    model: 'Minion',
    notes:
      'Skills.cs: Researching3.deprecated = DlcManager.IsExpansion1Active(); learnable only in the base game (Astronomy replaces it with EXPANSION1). Shares the display name Astronomy with the Astronomy skill (both use DUPLICANTS.ROLES.SENIOR_RESEARCHER).',
    perks: [
      { id: 'IncreaseLearningLarge', attribute: 'Learning', amount: 2 },
      { id: 'AllowInterStellarResearch', text: 'Virtual Planetarium Usage' },
      { id: 'CanMissionControl', text: 'Mission Control Station Usage' },
    ],
    moraleExpectation: 3,
    hat: 'hat_role_research3',
    cite: 'Database/Skills.cs: Skill("Researching3", DUPLICANTS.ROLES.SENIOR_RESEARCHER.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Astronomy',
    name: 'Astronomy',
    group: 'Research',
    tier: 1,
    prerequisites: ['Researching1'],
    model: 'Minion',
    dlcIds: ['EXPANSION1_ID'],
    notes:
      'Shares the display name Astronomy with Researching3 (both use DUPLICANTS.ROLES.SENIOR_RESEARCHER).',
    perks: [
      { id: 'CanUseClusterTelescope', text: 'Telescope Usage' },
      { id: 'CanUseClusterTelescopeEnclosed', text: 'Enclosed Telescope Usage' },
      { id: 'CanMissionControl', text: 'Mission Control Station Usage' },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_research3',
    cite: 'Database/Skills.cs: Skill("Astronomy", DUPLICANTS.ROLES.SENIOR_RESEARCHER.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'SpaceResearch',
    name: 'Data Analysis Researcher',
    group: 'Research',
    tier: 2,
    prerequisites: ['Astronomy'],
    model: 'Minion',
    dlcIds: ['EXPANSION1_ID'],
    perks: [
      { id: 'IncreaseLearningLargeSpace', attribute: 'Learning', amount: 2 },
      { id: 'AllowOrbitalResearch', text: 'Virtual Planetarium Usage' },
    ],
    moraleExpectation: 3,
    hat: 'hat_role_research4',
    cite: 'Database/Skills.cs: Skill("SpaceResearch", DUPLICANTS.ROLES.SPACE_RESEARCHER.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'RocketPiloting1',
    name: 'Rocket Piloting',
    group: 'Rocketry',
    tier: 0,
    prerequisites: [],
    model: 'Minion',
    dlcIds: ['EXPANSION1_ID'],
    perks: [{ id: 'CanUseRocketControlStation', text: 'Rocket Control Station Usage' }],
    moraleExpectation: 1,
    hat: 'hat_role_astronaut1',
    cite: 'Database/Skills.cs: Skill("RocketPiloting1", DUPLICANTS.ROLES.ROCKETPILOT.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'RocketPiloting2',
    name: 'Rocket Piloting II',
    group: 'Rocketry',
    tier: 2,
    prerequisites: ['RocketPiloting1', 'Astronomy'],
    model: 'Minion',
    dlcIds: ['EXPANSION1_ID'],
    perks: [{ id: 'IncreaseRocketSpeedSmall', attribute: 'SpaceNavigation', amount: 2 }],
    moraleExpectation: 3,
    hat: 'hat_role_astronaut2',
    cite: 'Database/Skills.cs: Skill("RocketPiloting2", DUPLICANTS.ROLES.SENIOR_ROCKETPILOT.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Cooking1',
    name: 'Grilling',
    group: 'Cooking',
    tier: 0,
    prerequisites: [],
    model: 'Minion',
    perks: [
      { id: 'IncreaseCookingSmall', attribute: 'Cooking', amount: 2 },
      { id: 'CanElectricGrill', text: 'Electric Grill Usage' },
    ],
    moraleExpectation: 1,
    hat: 'hat_role_cooking1',
    cite: 'Database/Skills.cs: Skill("Cooking1", DUPLICANTS.ROLES.JUNIOR_COOK.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Cooking2',
    name: 'Enhanced Seasoning',
    group: 'Cooking',
    tier: 1,
    prerequisites: ['Cooking1'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseCookingMedium', attribute: 'Cooking', amount: 2 },
      { id: 'CanGasRange', text: 'Gas Range Usage' },
      { id: 'CanDeepFry', text: 'Deep Fryer Usage' },
      { id: 'CanSushiBar', text: 'Sushi Bar Usage' },
      { id: 'CanSpiceGrinder', text: 'Spice Grinder Usage' },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_cooking2',
    cite: 'Database/Skills.cs: Skill("Cooking2", DUPLICANTS.ROLES.COOK.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Cooking3',
    name: 'Fine Dining',
    group: 'Cooking',
    tier: 2,
    prerequisites: ['Cooking2'],
    model: 'Minion',
    perks: [{ id: 'IncreaseCookingLarge', attribute: 'Cooking', amount: 2 }],
    moraleExpectation: 3,
    hat: 'hat_role_cooking3',
    cite: 'Database/Skills.cs: Skill("Cooking3", DUPLICANTS.ROLES.SENIOR_COOK.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Arting1',
    name: 'Art Fundamentals',
    group: 'Art',
    tier: 0,
    prerequisites: [],
    model: 'Minion',
    perks: [
      { id: 'IncreaseArtSmall', attribute: 'Art', amount: 2 },
      { id: 'CanArtUgly', text: 'Crude artwork quality' },
      {
        id: 'CanArt',
        text: 'Can produce artwork using: Blank Canvas, Sculpting Block, Large Sculpting Block, Ice Block, Metal Block, Wood Block',
      },
    ],
    moraleExpectation: 1,
    hat: 'hat_role_art1',
    cite: 'Database/Skills.cs: Skill("Arting1", DUPLICANTS.ROLES.JUNIOR_ARTIST.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Arting2',
    name: 'Aesthetic Design',
    group: 'Art',
    tier: 1,
    prerequisites: ['Arting1'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseArt', attribute: 'Art', amount: 2 },
      { id: 'CanArtOkay', text: 'Mediocre artwork quality' },
      { id: 'CanClothingAlteration', text: 'Clothing Refashionator Usage' },
      {
        id: 'CanStudyArtifact',
        text: 'Artifact Analysis Station Usage',
        condition:
          'EXPANSION1_ID active (Skills.cs: DlcManager.FeatureClusterSpaceEnabled() => IsExpansion1Active)',
      },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_art2',
    cite: 'Database/Skills.cs: Skill("Arting2", DUPLICANTS.ROLES.ARTIST.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Arting3',
    name: 'Masterworks',
    group: 'Art',
    tier: 2,
    prerequisites: ['Arting2'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseArtLarge', attribute: 'Art', amount: 2 },
      { id: 'CanArtGreat', text: 'Master artwork quality' },
    ],
    moraleExpectation: 3,
    hat: 'hat_role_art3',
    cite: 'Database/Skills.cs: Skill("Arting3", DUPLICANTS.ROLES.MASTER_ARTIST.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Hauling1',
    name: 'Improved Carrying I',
    group: 'Hauling',
    tier: 0,
    prerequisites: [],
    model: 'Minion',
    perks: [
      { id: 'IncreaseStrengthGofer', attribute: 'Strength', amount: 2 },
      { id: 'IncreaseCarryAmountSmall', attribute: 'CarryAmount', amount: 400 },
    ],
    moraleExpectation: 1,
    hat: 'hat_role_hauling1',
    cite: 'Database/Skills.cs: Skill("Hauling1", DUPLICANTS.ROLES.HAULER.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Hauling2',
    name: 'Improved Carrying II',
    group: 'Hauling',
    tier: 1,
    prerequisites: ['Hauling1'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseStrengthCourier', attribute: 'Strength', amount: 2 },
      { id: 'IncreaseCarryAmountMedium', attribute: 'CarryAmount', amount: 800 },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_hauling2',
    cite: 'Database/Skills.cs: Skill("Hauling2", DUPLICANTS.ROLES.MATERIALS_MANAGER.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'ThermalSuits',
    name: 'Suit Sustainability Training',
    group: 'Suits',
    tier: 1,
    prerequisites: ['Hauling1'],
    prerequisitesWithExpansion1: ['Hauling1', 'RocketPiloting1'],
    model: 'Minion',
    notes:
      'Skills.cs: with EXPANSION1 active ThermalSuits has prerequisites Hauling1 + RocketPiloting1 and requiredDlcIds EXPANSION1_ID (see prerequisitesWithExpansion1); base game: Hauling1 only.',
    perks: [
      { id: 'IncreaseAthleticsLarge', attribute: 'Athletics', amount: 2 },
      { id: 'ExosuitDurability', text: 'Slows Exosuit Durability Damage' },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_suits1',
    cite: 'Database/Skills.cs: Skill("ThermalSuits", DUPLICANTS.ROLES.SUIT_DURABILITY.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Suits1',
    name: 'Exosuit Training',
    group: 'Suits',
    tier: 2,
    prerequisites: ['ThermalSuits'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseAthletics', attribute: 'Athletics', amount: 2 },
      { id: 'ExosuitExpertise', text: 'Exosuit Penalty Reduction' },
    ],
    moraleExpectation: 3,
    hat: 'hat_role_suits2',
    cite: 'Database/Skills.cs: Skill("Suits1", DUPLICANTS.ROLES.SUIT_EXPERT.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Technicals1',
    name: 'Improved Tinkering',
    group: 'Technicals',
    tier: 0,
    prerequisites: [],
    model: 'Minion',
    perks: [{ id: 'IncreaseMachinerySmall', attribute: 'Machinery', amount: 2 }],
    moraleExpectation: 1,
    hat: 'hat_role_technicals1',
    cite: 'Database/Skills.cs: Skill("Technicals1", DUPLICANTS.ROLES.MACHINE_TECHNICIAN.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Technicals2',
    name: 'Electrical Engineering',
    group: 'Technicals',
    tier: 1,
    prerequisites: ['Technicals1'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseMachineryMedium', attribute: 'Machinery', amount: 2 },
      { id: 'CanPowerTinker', text: 'Generator Tuning and Microchip Crafting' },
      {
        id: 'CanCraftElectronics',
        text: 'Soldering Station Usage',
        condition:
          'perk itself requires DLC3_ID (SkillPerks.cs: SimpleSkillPerk(..., DlcManager.DLC3))',
      },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_technicals2',
    cite: 'Database/Skills.cs: Skill("Technicals2", DUPLICANTS.ROLES.POWER_TECHNICIAN.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Engineering1',
    name: 'Mechatronics Engineering',
    group: 'Technicals',
    tier: 2,
    prerequisites: ['Hauling2', 'Technicals2'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseMachineryLarge', attribute: 'Machinery', amount: 2 },
      { id: 'IncreaseConstructionMechatronics', attribute: 'Construction', amount: 2 },
      { id: 'ConveyorBuild', text: 'Conveyor Rail Construction' },
    ],
    moraleExpectation: 3,
    hat: 'hat_role_engineering1',
    cite: 'Database/Skills.cs: Skill("Engineering1", DUPLICANTS.ROLES.MECHATRONIC_ENGINEER.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Basekeeping1',
    name: 'Improved Strength',
    group: 'Basekeeping',
    tier: 0,
    prerequisites: [],
    model: 'Minion',
    perks: [{ id: 'IncreaseStrengthGroundskeeper', attribute: 'Strength', amount: 2 }],
    moraleExpectation: 1,
    hat: 'hat_role_basekeeping1',
    cite: 'Database/Skills.cs: Skill("Basekeeping1", DUPLICANTS.ROLES.HANDYMAN.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Basekeeping2',
    name: 'Plumbing',
    group: 'Basekeeping',
    tier: 1,
    prerequisites: ['Basekeeping1'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseStrengthPlumber', attribute: 'Strength', amount: 2 },
      { id: 'CanDoPlumbing', text: 'Pipe Emptying' },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_basekeeping2',
    cite: 'Database/Skills.cs: Skill("Basekeeping2", DUPLICANTS.ROLES.PLUMBER.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Pyrotechnics',
    name: 'Pyrotechnics',
    group: 'Basekeeping',
    tier: 2,
    prerequisites: ['Basekeeping2'],
    model: 'Minion',
    perks: [{ id: 'CanMakeMissiles', text: 'Blastshot Maker Usage' }],
    moraleExpectation: 3,
    hat: 'hat_role_pyrotechnics',
    cite: 'Database/Skills.cs: Skill("Pyrotechnics", DUPLICANTS.ROLES.PYROTECHNIC.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Astronauting1',
    name: 'Rocket Piloting',
    group: 'Suits',
    tier: 3,
    prerequisites: ['Researching3', 'Suits1'],
    model: 'Minion',
    notes:
      'Skills.cs: this variant exists only when EXPANSION1 is NOT active. With EXPANSION1 active the skill is a deprecated W.I.P. placeholder (deprecated = true) and cannot be learned.',
    perks: [{ id: 'CanUseRockets', text: 'Command Capsule Usage' }],
    moraleExpectation: 4,
    hat: 'hat_role_astronaut1',
    cite: 'Database/Skills.cs: Skill("Astronauting1", DUPLICANTS.ROLES.ASTRONAUTTRAINEE.NAME, ..., tier 3); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Astronauting2',
    name: 'Rocket Navigation',
    group: 'Suits',
    tier: 4,
    prerequisites: ['Astronauting1'],
    model: 'Minion',
    notes:
      'Skills.cs: this variant exists only when EXPANSION1 is NOT active. With EXPANSION1 active the skill is a deprecated W.I.P. placeholder (deprecated = true) and cannot be learned.',
    perks: [{ id: 'FasterSpaceFlight', attribute: 'SpaceNavigation', amount: 0.1 }],
    moraleExpectation: 5,
    hat: 'hat_role_astronaut2',
    cite: 'Database/Skills.cs: Skill("Astronauting2", DUPLICANTS.ROLES.ASTRONAUT.NAME, ..., tier 4); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Medicine1',
    name: 'Medicine Compounding',
    group: 'MedicalAid',
    tier: 0,
    prerequisites: [],
    model: 'Minion',
    perks: [
      { id: 'IncreaseCaringSmall', attribute: 'Caring', amount: 2 },
      { id: 'CanCompound', text: 'Apothecary Usage' },
    ],
    moraleExpectation: 1,
    hat: 'hat_role_medicalaid1',
    cite: 'Database/Skills.cs: Skill("Medicine1", DUPLICANTS.ROLES.JUNIOR_MEDIC.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Medicine2',
    name: 'Bedside Manner',
    group: 'MedicalAid',
    tier: 1,
    prerequisites: ['Medicine1'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseCaringMedium', attribute: 'Caring', amount: 2 },
      { id: 'CanDoctor', text: 'Sick Bay Usage' },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_medicalaid2',
    cite: 'Database/Skills.cs: Skill("Medicine2", DUPLICANTS.ROLES.MEDIC.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Medicine3',
    name: 'Advanced Medical Care',
    group: 'MedicalAid',
    tier: 2,
    prerequisites: ['Medicine2'],
    model: 'Minion',
    perks: [
      { id: 'IncreaseCaringLarge', attribute: 'Caring', amount: 2 },
      { id: 'CanAdvancedMedicine', text: 'Disease Clinic Usage' },
    ],
    moraleExpectation: 3,
    hat: 'hat_role_medicalaid3',
    cite: 'Database/Skills.cs: Skill("Medicine3", DUPLICANTS.ROLES.SENIOR_MEDIC.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Swimming',
    name: 'Basic Swimming',
    group: 'SwimmingSkills',
    tier: 0,
    prerequisites: [],
    model: 'Minion',
    dlcIds: ['DLC5_ID'],
    notes: 'Skill id is "Swimming" (not Swimming1) in Skills.cs.',
    perks: [
      { id: 'CanSwim', text: 'Novice swimming ability' },
      {
        id: 'IncreasedLungCapacity',
        text: 'Increased lung capacity (+100, DUPLICANTSTATS.STANDARD.Breath.SWIMMING_SKILL_LUNG_CAPACITY_BONUS)',
      },
      {
        id: 'ImprovedLiquidTemperatureTolerance',
        text: 'Increased resistance to Chilly Surroundings when in liquid',
      },
      {
        id: 'ReduceSaltWaterSwimmingEyeIrritation',
        text: 'Increased resistance to Eye Irritation caused by Salt Water',
      },
    ],
    moraleExpectation: 1,
    hat: 'hat_role_swimming',
    cite: 'Database/Skills.cs: Skill("Swimming", DUPLICANTS.ROLES.SWIMMER.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'Swimming2',
    name: 'Divemaster',
    group: 'SwimmingSkills',
    tier: 1,
    prerequisites: ['Swimming'],
    model: 'Minion',
    dlcIds: ['DLC5_ID'],
    perks: [
      { id: 'IncreaseSwimmerStaminaInLiquid', text: 'Reduced Stamina consumption when swimming' },
      { id: 'IncreaseSwimmerAthleticsInLiquid', text: 'Increased swimming speed' },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_swimming2',
    cite: 'Database/Skills.cs: Skill("Swimming2", DUPLICANTS.ROLES.EXPERT_SWIMMER.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'BionicsA1',
    name: 'Booster Processing I',
    group: 'BionicSkills',
    tier: 0,
    prerequisites: [],
    model: 'BionicMinion',
    dlcIds: ['DLC3_ID'],
    perks: [{ id: 'ExtraBionicBooster1', attribute: 'BionicBoosterSlots', amount: 1 }],
    moraleExpectation: 1,
    hat: 'hat_role_gainingboosters1',
    cite: 'Database/Skills.cs: Skill("BionicsA1", DUPLICANTS.ROLES.BIONICS_A1.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'BionicsA2',
    name: 'Booster Processing II',
    group: 'BionicSkills',
    tier: 1,
    prerequisites: ['BionicsA1'],
    model: 'BionicMinion',
    dlcIds: ['DLC3_ID'],
    perks: [
      { id: 'ExtraBionicBooster2', attribute: 'BionicBoosterSlots', amount: 1 },
      { id: 'IncreaseAthleticsBionicsA2', attribute: 'Athletics', amount: 2 },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_gainingboosters2',
    cite: 'Database/Skills.cs: Skill("BionicsA2", DUPLICANTS.ROLES.BIONICS_A2.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'BionicsA3',
    name: 'Complex Processing',
    group: 'BionicSkills',
    tier: 2,
    prerequisites: ['BionicsA2'],
    model: 'BionicMinion',
    dlcIds: ['DLC3_ID'],
    perks: [
      { id: 'ExtraBionicBooster3', attribute: 'BionicBoosterSlots', amount: 2 },
      { id: 'ExosuitExpertise', text: 'Exosuit Penalty Reduction' },
    ],
    moraleExpectation: 3,
    hat: 'hat_role_gainingboosters3',
    cite: 'Database/Skills.cs: Skill("BionicsA3", DUPLICANTS.ROLES.BIONICS_A3.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'BionicsB1',
    name: 'Improved Gears I',
    group: 'BionicSkills',
    tier: 0,
    prerequisites: [],
    model: 'BionicMinion',
    dlcIds: ['DLC3_ID'],
    perks: [{ id: 'EfficientBionicGears', text: '50% Grinding Gears penalty reduction' }],
    moraleExpectation: 1,
    hat: 'hat_role_innerworkings1',
    cite: 'Database/Skills.cs: Skill("BionicsB1", DUPLICANTS.ROLES.BIONICS_B1.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'BionicsB2',
    name: 'Improved Gears II',
    group: 'BionicSkills',
    tier: 1,
    prerequisites: ['BionicsB1'],
    model: 'BionicMinion',
    dlcIds: ['DLC3_ID'],
    perks: [
      { id: 'ExtraBionicBooster4', attribute: 'BionicBoosterSlots', amount: 1 },
      { id: 'IncreaseAthleticsBionicsB2', attribute: 'Athletics', amount: 2 },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_innerworkings2',
    cite: 'Database/Skills.cs: Skill("BionicsB2", DUPLICANTS.ROLES.BIONICS_B2.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'BionicsC1',
    name: 'Schematics',
    group: 'BionicSkills',
    tier: 0,
    prerequisites: [],
    model: 'BionicMinion',
    dlcIds: ['DLC3_ID'],
    perks: [
      {
        id: 'CanCraftElectronics',
        text: 'Soldering Station Usage',
        condition:
          'perk itself requires DLC3_ID (SkillPerks.cs: SimpleSkillPerk(..., DlcManager.DLC3))',
      },
      { id: 'IncreaseAthleticsBionicsC1', attribute: 'Athletics', amount: 2 },
    ],
    moraleExpectation: 1,
    hat: 'hat_role_craftingboosters1',
    cite: 'Database/Skills.cs: Skill("BionicsC1", DUPLICANTS.ROLES.BIONICS_C1.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'BionicsC2',
    name: 'Advanced Schematics',
    group: 'BionicSkills',
    tier: 1,
    prerequisites: ['BionicsC1'],
    model: 'BionicMinion',
    dlcIds: ['DLC3_ID'],
    perks: [
      { id: 'ExtraBionicBooster6', attribute: 'BionicBoosterSlots', amount: 1 },
      { id: 'IncreaseAthleticsBionicsC2', attribute: 'Athletics', amount: 2 },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_craftingboosters2',
    cite: 'Database/Skills.cs: Skill("BionicsC2", DUPLICANTS.ROLES.BIONICS_C2.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'BionicsC3',
    name: 'Power Banking',
    group: 'BionicSkills',
    tier: 2,
    prerequisites: ['BionicsB2', 'BionicsC2'],
    model: 'BionicMinion',
    dlcIds: ['DLC3_ID'],
    perks: [{ id: 'ExtraBionicBatteries', attribute: 'BionicBatteryCountCapacity', amount: 2 }],
    moraleExpectation: 3,
    hat: 'hat_role_innerworkings3',
    cite: 'Database/Skills.cs: Skill("BionicsC3", DUPLICANTS.ROLES.BIONICS_C3.NAME, ..., tier 2); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'BionicsD1',
    name: 'Improved Hardware',
    group: 'BionicSkills',
    tier: 0,
    prerequisites: [],
    model: 'BionicMinion',
    dlcIds: ['DLC3_ID'],
    perks: [
      { id: 'BionicEardrumsDefense', text: 'Immunity to effect PoppedEarDrums' },
      { id: 'BionicMinorEyeIrritationDefense', text: 'Immunity to effect MinorIrritation' },
      { id: 'BionicMajorEyeIrritationDefense', text: 'Immunity to effect MajorIrritation' },
    ],
    moraleExpectation: 1,
    hat: 'hat_role_gainingboosters1',
    cite: 'Database/Skills.cs: Skill("BionicsD1", DUPLICANTS.ROLES.BIONICS_D1.NAME, ..., tier 0); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
  {
    id: 'BionicsD2',
    name: 'Climate Control',
    group: 'BionicSkills',
    tier: 1,
    prerequisites: ['BionicsD1'],
    model: 'BionicMinion',
    dlcIds: ['DLC3_ID'],
    perks: [
      { id: 'BionicToastySurroundingsDefense', text: 'Immunity to effect WarmAir' },
      { id: 'BionicChillySurroundingsDefense', text: 'Immunity to effect ColdAir' },
    ],
    moraleExpectation: 2,
    hat: 'hat_role_gainingboosters1',
    cite: 'Database/Skills.cs: Skill("BionicsD2", DUPLICANTS.ROLES.BIONICS_D2.NAME, ..., tier 1); perks from Database/SkillPerks.cs; names from STRINGS/DUPLICANTS.cs ROLES',
  },
]

export const skillGroups: {
  id: string
  name: string
  /** Attributes.* ids from SkillGroup.relevantAttributes (Database/SkillGroups.cs) */
  relevantAttributes?: string[]
  /** primary attribute (first relevantAttributes entry), where there is one */
  attribute?: string
  /** SkillGroup.choreGroupID / requiredChoreGroups (Database/SkillGroups.cs); learning is blocked when the duplicant has this chore group disabled */
  requiredChoreGroups?: string[]
  /** SkillGroup.allowAsAptitude: false means it can never be rolled as a duplicant interest */
  allowAsAptitude: boolean
  /** this group can be an interest (aptitude): boosts XP gain and morale for skills of this group, see skillConstants.interest */
  interestAptitude?: string
  /** SkillGroup constructor condition */
  condition?: string
  cite: string
}[] = [
  {
    id: 'Mining',
    name: 'Digger',
    relevantAttributes: ['Digging'],
    attribute: 'Digging',
    requiredChoreGroups: ['Dig'],
    allowAsAptitude: true,
    interestAptitude: 'Digging',
    cite: 'Database/SkillGroups.cs Mining; name STRINGS/DUPLICANTS.cs SKILLGROUPS.MINING.NAME; attribute via ChoreGroups.Dig (Database/ChoreGroups.cs)',
  },
  {
    id: 'Building',
    name: 'Builder',
    relevantAttributes: ['Construction'],
    attribute: 'Construction',
    requiredChoreGroups: ['Build'],
    allowAsAptitude: true,
    interestAptitude: 'Building',
    cite: 'Database/SkillGroups.cs Building; ChoreGroups.Build -> Construction',
  },
  {
    id: 'Farming',
    name: 'Farmer',
    relevantAttributes: ['Botanist'],
    attribute: 'Botanist',
    requiredChoreGroups: ['Farming'],
    allowAsAptitude: true,
    interestAptitude: 'Farming',
    cite: 'Database/SkillGroups.cs Farming; ChoreGroups.Farming -> Botanist',
  },
  {
    id: 'Ranching',
    name: 'Rancher',
    relevantAttributes: ['Ranching'],
    attribute: 'Ranching',
    requiredChoreGroups: ['Ranching'],
    allowAsAptitude: true,
    interestAptitude: 'Ranching',
    cite: 'Database/SkillGroups.cs Ranching; ChoreGroups.Ranching -> Ranching',
  },
  {
    id: 'Cooking',
    name: 'Cooker',
    relevantAttributes: ['Cooking'],
    attribute: 'Cooking',
    requiredChoreGroups: ['Cook'],
    allowAsAptitude: true,
    interestAptitude: 'Cooking',
    cite: 'Database/SkillGroups.cs Cooking; ChoreGroups.Cook -> Cooking',
  },
  {
    id: 'Art',
    name: 'Decorator',
    relevantAttributes: ['Art'],
    attribute: 'Art',
    requiredChoreGroups: ['Art'],
    allowAsAptitude: true,
    interestAptitude: 'Art',
    cite: 'Database/SkillGroups.cs Art; ChoreGroups.Art -> Art',
  },
  {
    id: 'Research',
    name: 'Researcher',
    relevantAttributes: ['Learning'],
    attribute: 'Learning',
    requiredChoreGroups: ['Research'],
    allowAsAptitude: true,
    interestAptitude: 'Research',
    cite: 'Database/SkillGroups.cs Research; ChoreGroups.Research -> Learning',
  },
  {
    id: 'Rocketry',
    name: 'Pilot',
    relevantAttributes: ['SpaceNavigation'],
    attribute: 'SpaceNavigation',
    requiredChoreGroups: ['Rocketry'],
    allowAsAptitude: true,
    interestAptitude: 'Rocketry',
    condition: 'only created when DlcManager.FeatureClusterSpaceEnabled() (EXPANSION1 active)',
    cite: 'Database/SkillGroups.cs Rocketry; ChoreGroups.Rocketry -> SpaceNavigation',
  },
  {
    id: 'Suits',
    name: 'Suit Wearer',
    relevantAttributes: ['Athletics'],
    attribute: 'Athletics',
    requiredChoreGroups: ['Hauling'],
    allowAsAptitude: true,
    interestAptitude: 'Suits',
    cite: 'Database/SkillGroups.cs Suits (choreGroupID is "" in the constructor; relevantAttributes = Attributes.Athletics; requiredChoreGroups = Hauling)',
  },
  {
    id: 'Hauling',
    name: 'Supplier',
    relevantAttributes: ['Strength'],
    attribute: 'Strength',
    requiredChoreGroups: ['Hauling'],
    allowAsAptitude: true,
    interestAptitude: 'Hauling',
    cite: 'Database/SkillGroups.cs Hauling; ChoreGroups.Hauling -> Strength',
  },
  {
    id: 'Technicals',
    name: 'Operator',
    relevantAttributes: ['Machinery'],
    attribute: 'Machinery',
    requiredChoreGroups: ['MachineOperating'],
    allowAsAptitude: true,
    interestAptitude: 'Technicals',
    cite: 'Database/SkillGroups.cs Technicals; ChoreGroups.MachineOperating -> Machinery',
  },
  {
    id: 'MedicalAid',
    name: 'Doctor',
    relevantAttributes: ['Caring'],
    attribute: 'Caring',
    allowAsAptitude: true,
    interestAptitude: 'MedicalAid',
    cite: 'Database/SkillGroups.cs MedicalAid (requiredChoreGroups is never assigned); ChoreGroups.MedicalAid -> Caring',
  },
  {
    id: 'Basekeeping',
    name: 'Tidier',
    relevantAttributes: ['Strength'],
    attribute: 'Strength',
    requiredChoreGroups: ['Basekeeping'],
    allowAsAptitude: true,
    interestAptitude: 'Basekeeping',
    cite: 'Database/SkillGroups.cs Basekeeping; ChoreGroups.Basekeeping -> Strength',
  },
  {
    id: 'SwimmingSkills',
    name: 'Swimming',
    relevantAttributes: [],
    requiredChoreGroups: [],
    allowAsAptitude: false,
    cite: 'Database/SkillGroups.cs SwimmingSkills (name arg is DUPLICANTS.CHOREGROUPS.SWIMMING.NAME; no STRINGS SKILLGROUPS entry); allowAsAptitude = false',
  },
  {
    id: 'BionicSkills',
    name: '',
    relevantAttributes: [],
    requiredChoreGroups: [],
    allowAsAptitude: false,
    condition: 'only created when DlcManager.IsContentSubscribed("DLC3_ID")',
    cite: 'Database/SkillGroups.cs BionicSkills (name arg is ""); allowAsAptitude = false',
  },
]

// ---- skillConstants -------------------------------------------------------

/** Mathf.Pow on floats is single precision; Math.fround keeps the same rounding steps. */
const f = Math.fround

export const skillConstants = {
  /**
   * (a) Morale expectation.
   * Each mastered skill that was NOT granted (MinionResume.GrantSkill / GrantedSkillIDs are skipped) adds
   * (skill.tier + 1) to the duplicant's QualityOfLifeExpectation attribute through ONE modifier named
   * "Skills Learned" (STRINGS DUPLICANTS.NEEDS.QUALITYOFLIFE.EXPECTATION_MOD_NAME).
   * Cite: MinionResume.cs UpdateExpectations(): num += skill.tier + 1.
   * Skill.GetMoraleExpectation() returns TUNING.SKILLS.SKILL_TIER_MORALE_COST[tier] = {1,2,3,4,5,6,7},
   * which is the same value (tier + 1) for tiers 0..6 (Database/Skill.cs, TUNING/SKILLS.cs).
   * The highest tier in Skills.cs is 4 (Astronauting2), so the table is never indexed out of range.
   * A tier 0 skill therefore costs 1, not 0: there is no 0-cost special case in the code.
   */
  moraleExpectation: {
    perSkillFormula: 'tier + 1',
    skillTierMoraleCost: [1, 2, 3, 4, 5, 6, 7],
    grantedSkillsAreExcluded: true,
    attributeId: 'QualityOfLifeExpectation',
    modifierName: 'Skills Learned',
    /** Attributes.QualityOfLifeExpectation is created with base value 0f (Database/Attributes.cs). */
    baselineExpectation: 0,
    baselineNote:
      'QualityOfLifeExpectation base value is 0f (Database/Attributes.cs). No other code in the decompile adds to it except the skill modifier in MinionResume.UpdateExpectations. Expectations.ExpectationsByTier ({1,2,4,8,12,16,20,25}, Expectations.cs) is defined but referenced nowhere else, so it is legacy and ignored.',
    /** Morale (QualityOfLife attribute) every Minion starts with: BaseMinionConfig.cs adds +1 to Attributes.QualityOfLife. */
    baselineMorale: 1,
    cite: 'MinionResume.cs UpdateExpectations(); Database/Skill.cs GetMoraleExpectation(); TUNING/SKILLS.cs SKILL_TIER_MORALE_COST; Database/Attributes.cs QualityOfLifeExpectation; BaseMinionConfig.cs (QualityOfLife +1f)',
  },

  /**
   * Total expectation for a set of mastered (non-granted) skills, as MinionResume.UpdateExpectations computes it.
   * Pass skill tiers; sums (tier + 1).
   */
  expectationForTiers: (tiers: number[]): number => tiers.reduce((sum, tier) => sum + tier + 1, 0),

  /**
   * (a, continued) Can the duplicant learn another skill, w.r.t. morale? MinionResume.BelowMoraleExpectation:
   * morale (+1 if the skill group is an interest of the duplicant) must satisfy
   * currentExpectation + skill.GetMoraleExpectation() <= morale.
   */
  canAffordMoraleFor: (
    expectation: number,
    morale: number,
    tier: number,
    hasInterest: boolean,
  ): boolean => expectation + (tier + 1) <= morale + (hasInterest ? 1 : 0),

  /**
   * (b) Experience.
   * TUNING/SKILLS.cs: TARGET_SKILLS_EARNED = 15, TARGET_SKILLS_CYCLE = 250, EXPERIENCE_LEVEL_POWER = 1.44,
   * PASSIVE_EXPERIENCE_PORTION = 0.5, ACTIVE_EXPERIENCE_PORTION = 0.6. MinionResume.cs uses a literal 600 (seconds per cycle).
   *   CalculatePreviousExperienceBar(n) = pow(n / 15, 1.44) * 250 * 600   (total experience at which n points are earned)
   *   CalculateNextExperienceBar(n)     = pow((n + 1) / 15, 1.44) * 250 * 600
   *   CalculateTotalSkillPointsGained(xp) = floor(pow(xp / 250 / 600, 1 / 1.44) * 15)
   * Skill points available to spend: TotalSkillPointsGained - SkillsMastered + GrantedSkillIDs.Count
   *   (MinionResume.AvailableSkillpoints; SkillsMastered counts every MasteryBySkillID entry that is true, granted ones included).
   * Passive XP: MinionResume.Sim200ms adds dt * 0.5 per second while not dead.
   * Active XP: AddExperienceWithAptitude adds amount * aptitudeMultiplier * 0.6.
   */
  experience: {
    targetSkillsEarned: 15,
    targetSkillsCycle: 250,
    secondsPerCycle: 600,
    experienceLevelPower: 1.44,
    passiveExperiencePortion: 0.5,
    activeExperiencePortion: 0.6,
    /** Telepad.startingSkillPoints = 1f for HeadquartersConfig and ExobaseHeadquartersConfig; each point is applied with ForceAddSkillPoint on arrival from the printing pod. */
    startingSkillPoints: 1,
    /** ForceSetSkillPoints(n) sets totalExperienceGained to CalculatePreviousExperienceBar(n), plus 1% of the gap to the next bar if that does not yield exactly n points (float rounding). */
    forceSetSkillPointsGapFraction: 0.01,
    /** MinionResume.OnDeserialized: if TotalSkillPointsGained is above 1000 or below 0 the game calls ForceSetSkillPoints(100). */
    sanityResetThreshold: 1000,
    sanityResetPoints: 100,
    cite: 'TUNING/SKILLS.cs; MinionResume.cs (CalculateTotalSkillPointsGained, CalculateNextExperienceBar, CalculatePreviousExperienceBar, AvailableSkillpoints, ForceSetSkillPoints, Sim200ms, OnDeserialized); Telepad.cs; HeadquartersConfig.cs',
  },

  /**
   * (b) Total experience at which a duplicant has earned N skill points.
   * Faithful translation of MinionResume.CalculatePreviousExperienceBar(int current_skill_points):
   *   Mathf.Pow((float)n / (float)SKILLS.TARGET_SKILLS_EARNED, SKILLS.EXPERIENCE_LEVEL_POWER)
   *     * (float)SKILLS.TARGET_SKILLS_CYCLE * 600f
   * with TARGET_SKILLS_EARNED = 15, EXPERIENCE_LEVEL_POWER = 1.44, TARGET_SKILLS_CYCLE = 250 (TUNING/SKILLS.cs).
   */
  experienceForPoints: (points: number): number =>
    f(f(f(Math.pow(f(points / 15), f(1.44))) * 250) * 600),

  /**
   * Experience needed for the next point after : MinionResume.CalculateNextExperienceBar(int).
   */
  experienceForNextPoint: (points: number): number =>
    f(f(f(Math.pow(f((points + 1) / 15), f(1.44))) * 250) * 600),

  /**
   * Skill points earned for a given total experience: MinionResume.CalculateTotalSkillPointsGained(float).
   *   Mathf.FloorToInt(Mathf.Pow(xp / 250 / 600, 1f / 1.44) * 15)
   */
  pointsForExperience: (experience: number): number =>
    Math.floor(f(f(Math.pow(f(f(experience / 250) / 600), f(1 / f(1.44)))) * 15)),

  /**
   * (c) Interest (aptitude) bonuses.
   * XP multiplier: MinionResume.GetAptitudeExperienceMultiplier = 1 + aptitude * APTITUDE_EXPERIENCE_MULTIPLIER (0.5) * buildingFrequencyMultiplier.
   * A rolled interest has aptitude = DUPLICANTSTATS.APTITUDE_BONUS = 1, so XP x1.5 when buildingFrequencyMultiplier is 1.
   * Morale: MinionResume.UpdateMorale adds (int)aptitude to QualityOfLife (modifier "Interested Skills Learned") for each mastered
   * non-granted skill whose group has an aptitude, i.e. +1 morale per learned skill in an interest group.
   * Learning check: BelowMoraleExpectation adds +1 to the morale it compares when the skill group is an interest.
   * Starting attributes: MinionStartingStats.GenerateAttributes adds APTITUDE_ATTRIBUTE_BONUSES[interestCount - 1] = {7, 3, 1} to every
   * relevantAttribute of each interest (one interest +7, two +3 each, three +1 each).
   * Interest count: MinionStartingStats.GenerateAptitudes rolls Random.Range(1, 4) = 1 to 3 interests from groups with allowAsAptitude;
   * Bionic duplicants get none (returns early when personality.model == BionicMinionConfig.MODEL).
   */
  interest: {
    aptitudeBonus: 1,
    aptitudeExperienceMultiplier: 0.5,
    experienceMultiplier: (aptitude: number, buildingFrequencyMultiplier = 1): number =>
      1 + aptitude * 0.5 * buildingFrequencyMultiplier,
    moralePerLearnedSkillInGroup: 1,
    moraleModifierName: 'Interested Skills Learned',
    learnCheckMoraleBonus: 1,
    startingAttributeBonusesByInterestCount: [7, 3, 1],
    interestCountRange: { min: 1, max: 3 },
    cite: 'TUNING/SKILLS.cs APTITUDE_EXPERIENCE_MULTIPLIER; TUNING/DUPLICANTSTATS.cs APTITUDE_BONUS, APTITUDE_ATTRIBUTE_BONUSES; MinionResume.cs GetAptitudeExperienceMultiplier, UpdateMorale, BelowMoraleExpectation; MinionStartingStats.cs GenerateAptitudes, GenerateAttributes',
  },

  /**
   * (d) Learning rules and hats.
   * MinionResume.GetSkillMasteryConditions / CanMasterSkill: a skill can be mastered only when
   *   - IsAbleToLearnSkill: the skill group's choreGroupID is not disabled by the duplicant's traits (Traits.IsChoreGroupDisabled);
   *   - HasSkillPointsRequiredForSkill: AvailableSkillpoints >= 1 (every skill costs exactly 1 point regardless of tier);
   *   - HasMasteredDirectlyRequiredSkillsForSkill: every id in priorSkills is mastered (all, not any);
   *   - BelowMoraleExpectation is NOT a blocker: it only produces the StressWarning condition, CanMasterSkill ignores it.
   * Deprecated skills (Skill.deprecated) are flagged in Skills.cs; this file omits them.
   * Model gating: Skill.requiredDuplicantModel must equal the duplicant's model for the skill to show (SkillsScreen.cs, UIDupeRandomizer.cs).
   * Hats: each mastered skill unlocks Skill.hat in MinionResume.ownedHats (MasterSkill / GrantSkill); the active hat is currentHat/targetHat.
   * Granted skills: GrantSkill marks the skill mastered without spending a point, adds to GrantedSkillIDs, and skips morale/expectation effects.
   */
  learning: {
    pointsPerSkill: 1,
    requiresAllPriorSkills: true,
    moraleIsBlocker: false,
    cite: 'MinionResume.cs IsAbleToLearnSkill, BelowMoraleExpectation, HasMasteredDirectlyRequiredSkillsForSkill, HasSkillPointsRequiredForSkill, GetSkillMasteryConditions, CanMasterSkill, MasterSkill, GrantSkill, AvailableSkillpoints',
  },
}
