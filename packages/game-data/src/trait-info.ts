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

import {
  bionicTraits,
  congenitalTraits,
  geneticTraits,
  joyTraits,
  needTraits,
  otherGrantTraits,
  specialTraits,
  stressTraits,
} from './trait-lists-b.ts'
import { negativeTraits, positiveTraits } from './trait-lists-a.ts'
import type { DuplicantModel, TraitCategory, TraitInfo } from './trait-types.ts'

export { extraTraits, traitIdFixes, type TraitExtra } from './trait-extras.ts'
export type { DuplicantModel, TraitCategory, TraitInfo } from './trait-types.ts'

export const traitInfo: TraitInfo[] = [
  ...positiveTraits,
  ...negativeTraits,
  ...congenitalTraits,
  ...geneticTraits,
  ...stressTraits,
  ...joyTraits,
  ...needTraits,
  ...bionicTraits,
  ...specialTraits,
  ...otherGrantTraits,
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
