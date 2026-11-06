import {
  TYPE_CODE_MASK,
  TypeCode,
  type SaveGame,
  type Template,
  type TypeInfo,
} from '@oni-duplicity/save-parser'
import type { RawPath } from './model.ts'

const templateMaps = new WeakMap<Template[], Map<string, Template>>()

export function templatesOf(save: SaveGame): Map<string, Template> {
  let map = templateMaps.get(save.templates)
  if (!map) {
    map = new Map(save.templates.map((t) => [t.name, t]))
    templateMaps.set(save.templates, map)
  }
  return map
}

// Root templates, as named by the parser.
const ROOTS: Record<string, string> = {
  world: 'Klei.SaveFileRoot',
  settings: 'Game+Settings',
  gameData: 'Game+GameSaveData',
}

export const COLLECTIONS: number[] = [
  TypeCode.Array,
  TypeCode.List,
  TypeCode.HashSet,
  TypeCode.Queue,
]
export const codeOf = (type: TypeInfo) => type.info & TYPE_CODE_MASK
const userType = (name: string): TypeInfo => ({ info: TypeCode.UserDefined, templateName: name })

/** The declared type of the value at `path`, or null when the save's templates do not cover it. */
export function typeAt(save: SaveGame, path: RawPath): TypeInfo | null {
  const templates = templatesOf(save)
  let type: TypeInfo
  let rest: RawPath
  const [head] = path
  if (typeof head === 'string' && head in ROOTS) {
    type = userType(ROOTS[head]!)
    rest = path.slice(1)
  } else if (head === 'gameObjects') {
    // gameObjects[g].gameObjects[i].behaviors[j].templateData: typed by the behavior's name.
    const [, g, sub, i, listName, j, field] = path
    if (
      typeof g !== 'number' ||
      sub !== 'gameObjects' ||
      typeof i !== 'number' ||
      listName !== 'behaviors' ||
      typeof j !== 'number' ||
      field !== 'templateData'
    )
      return null
    const behavior = save.gameObjects[g]?.gameObjects[i]?.behaviors[j]
    if (!behavior?.templateData) return null
    type = userType(behavior.name)
    rest = path.slice(7)
  } else {
    return null
  }
  for (const part of rest) {
    const code = codeOf(type)
    if (code === TypeCode.UserDefined) {
      const template = templates.get(type.templateName!)
      const member = [...(template?.fields ?? []), ...(template?.properties ?? [])].find(
        (m) => m.name === part,
      )
      if (!member) return null
      type = member.type
    } else if (COLLECTIONS.includes(code)) {
      if (typeof part !== 'number') return null
      type = type.subTypes![0]!
    } else if (code === TypeCode.Pair) {
      if (part !== 'key' && part !== 'value') return null
      type = type.subTypes![part === 'key' ? 0 : 1]!
    } else {
      return null
    }
  }
  return type
}
