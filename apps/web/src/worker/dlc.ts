import type { SaveGame } from '@oni-duplicity/save-parser'
import { readDemolior, type DemoliorView } from './dlc-demolior.ts'
import { readGeothermal, type GeothermalView } from './dlc-geothermal.ts'
import { readMixing, type MixingView } from './dlc-mixing.ts'
import { dlcIdsOf } from './dlc-shared.ts'

/**
 * DLC-only views and the one Demolior edit. Everything here follows the decompile of
 * Kupie/ONI_Decomp; each reader cites the class it mirrors.
 */

export {
  clampImpact,
  currentCycle,
  demoliorObjects,
  demoliorTravel,
  MIN_CYCLES_BEFORE_IMPACT,
  readDemolior,
  type DemoliorView,
} from './dlc-demolior.ts'
export { setDemoliorImpact } from './dlc-demolior-edit.ts'
export { readGeothermal, type GeothermalVentView, type GeothermalView } from './dlc-geothermal.ts'
export { readMixing, type MixingEntry, type MixingView } from './dlc-mixing.ts'

// --- Page ---------------------------------------------------------------------

export interface DlcPageView {
  dlcIds: string[]
  demolior: DemoliorView | null
  mixing: MixingView | null
  geothermal: GeothermalView | null
}

export function listDlc(save: SaveGame): DlcPageView {
  return {
    dlcIds: dlcIdsOf(save),
    demolior: readDemolior(save),
    mixing: readMixing(save),
    geothermal: readGeothermal(save),
  }
}
