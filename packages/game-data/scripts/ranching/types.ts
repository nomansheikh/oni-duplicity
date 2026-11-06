import type { Interp, Obj, Value } from '../csharp/interp.ts'
import type { ClassInfo, SourceIndex } from '../csharp/source.ts'

export interface DlcIds {
  required: string[]
  forbidden: string[]
}

export interface RawDiet {
  consumed: string[]
  produced: string
  caloriesPerKg: number
  conversion: number
  disease?: string
  diseasePerKg: number
  solidTile: boolean
  foodType: string
  dlc: DlcIds
}

export interface RawModifier {
  attr: string
  value: number
  multiplier: boolean
}

export interface RawSeed {
  id: string
  name?: string
  plant: Obj
  productionType?: string
  dlc: DlcIds
}

export interface RawElement {
  id: string
  state: string
  materialCategory: string
  tags: string[]
  disabled: boolean
  refinedMetalTarget?: string
}

/** What one species run observed. */
export interface Capture {
  traits: RawModifier[]
  diet: RawDiet[]
  fertile?: Record<string, Value>
  space?: number
  deaths: { id: string; count: number }[]
  defs: Obj[]
  nameRef?: string
  tags: string[]
  ranchable: boolean
}

export interface Runner {
  interp: Interp
  idx: SourceIndex
  seeds: RawSeed[]
  errors: Map<string, number>
  run(config: ClassInfo): { capture: Capture; dlc: DlcIds; id: string | undefined }
  dlcOf: (cls: ClassInfo | undefined) => DlcIds
  wildEffect: RawModifier[]
  foodDlc: Map<string, DlcIds>
  /** String key of the display name a config passes when it creates the entity with this id. */
  nameRefOf(id: string): string | undefined
}

/** Mutable state shared by the interpreter hooks; `cap` is swapped per run. */
export interface Ctx {
  interp: Interp
  idx: SourceIndex
  cap: Capture
  seeds: RawSeed[]
  plantsById: Map<string, Obj>
  dlcOf: (cls: ClassInfo | undefined) => DlcIds
  dlcFromValue: (v: Value) => DlcIds
}

export const newCapture = (): Capture => ({
  traits: [],
  diet: [],
  deaths: [],
  defs: [],
  tags: [],
  ranchable: false,
})
