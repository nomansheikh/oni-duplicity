export type RevealLevel = 'hidden' | 'peeked' | 'revealed'

export interface PoiView {
  id: string
  kind: 'harvestable' | 'artifact'
  /** The type ID, e.g. `SandyOreField`. */
  type: string
  name: string
  location: { r: number; q: number }
  /** Whether the starmap shows the POI, from the fog of war; unset when it could not be read. */
  reveal?: RevealLevel
  harvest?: {
    /** Kilograms in stock now and when full. */
    current: number
    max: number
    /** Seconds to refill from empty. */
    rechargeSeconds: number
    elements: { name: string; share: number }[]
  }
  artifact?: {
    /** The state machine state, e.g. `recharging`. */
    state: string
    /** 0 to 1. */
    charge: number
    /** Seconds until the POI produces its next artifact. */
    remainingSeconds: number
    harvests: number
    /** The artifact waiting on the starmap tile, if any. */
    waiting?: string
  }
}

export interface PoiOverview {
  pois: PoiView[]
  /** Known starmap cells and how many are not fully revealed; null when the fog could not be read. */
  reveal: { cells: number; pending: number } | null
}
