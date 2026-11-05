import type { SaveGame } from '@oni-duplicity/save-parser'
import { asNumber, behaviorOf, dlcIdsOf, groupObjects } from './dlc-shared.ts'

export interface GeothermalVentView {
  id: string
  /** `GeothermalVent.QuestProgress`. */
  progress: string
  recentMass: number
  /** Total mass in `availableMaterial`. */
  availableMass: number
  availableItems: number
}

export interface GeothermalView {
  /** `GeothermalController.ProgressState` as a readable name. */
  state: string
  stateIndex: number
  vents: GeothermalVentView[]
}

/** `GeothermalController.ProgressState`. */
const CONTROLLER_STATES = [
  'Not started',
  'Fetching steel',
  'Reconnecting pipes',
  'Repair notice sent',
  'Repaired',
  'At capacity',
  'Complete',
]
/** `GeothermalVent.QuestProgress`. */
const VENT_PROGRESS = ['Uninitialized', 'Entombed', 'Complete']

export function readGeothermal(save: SaveGame): GeothermalView | null {
  if (!dlcIdsOf(save).includes('DLC2_ID')) return null
  const controller = groupObjects(save, 'GeothermalControllerEntity')[0]
  const state = controller
    ? asNumber(behaviorOf(controller, 'GeothermalController')?.templateData?.state)
    : undefined
  if (state === undefined) return null
  const vents = groupObjects(save, 'GeothermalVentEntity').flatMap((obj, index) => {
    const vent = behaviorOf(obj, 'GeothermalVent')?.templateData
    const progress = asNumber(vent?.progress)
    if (!vent || progress === undefined) return []
    const material = Array.isArray(vent.availableMaterial)
      ? (vent.availableMaterial as { mass?: unknown }[])
      : []
    return [
      {
        id: `GeothermalVentEntity:${index}`,
        progress: VENT_PROGRESS[progress] ?? `Unknown (${progress})`,
        recentMass: asNumber(vent.recentMass) ?? 0,
        availableMass: material.reduce((sum, item) => sum + (asNumber(item?.mass) ?? 0), 0),
        availableItems: material.length,
      },
    ]
  })
  return {
    state: CONTROLLER_STATES[state] ?? `Unknown (${state})`,
    stateIndex: state,
    vents,
  }
}
