import type { LoadErrorInfo } from '@/lib/load-error'
import type {
  Catalogs,
  CritterView,
  DestinationView,
  GameSettingView,
  TechView,
  StoryView,
  WorldView,
  DuplicantView,
  GeyserView,
  MaterialView,
  Summary,
} from '@/worker/model'

export type State =
  | { status: 'idle' }
  | { status: 'loading'; fileName: string; progress: number }
  | { status: 'error'; info: LoadErrorInfo }
  | { status: 'loaded'; summary: Summary }

export interface Views {
  duplicants: DuplicantView[]
  geysers: GeyserView[]
  materials: MaterialView[]
  critters: CritterView[]
  techs: TechView[]
  gameSettings: GameSettingView[]
  worlds: WorldView[]
  stories: StoryView[]
  destinations: DestinationView[]
}

export interface EditStatus {
  edits: number
  canUndo: boolean
  canRedo: boolean
}

export interface Loaded {
  summary: Summary
  views: Views
  catalogs: Catalogs
}

export const NO_EDITS: EditStatus = { edits: 0, canUndo: false, canRedo: false }
