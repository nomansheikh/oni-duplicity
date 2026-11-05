import { IS_VALUE_TYPE, TypeCode, type SaveGame, type TypeInfo } from '@oni-duplicity/save-parser'
import type { RawPath } from './model.ts'
import { codeOf, COLLECTIONS, templatesOf, typeAt } from './raw-types.ts'

/** The type has no value we can construct (a template the save does not define). */
class NoDefault extends Error {}

/**
 * A zero value of a declared type: what the game writes for a freshly constructed one.
 * Throws `NoDefault` when any type reachable from it has no template in the save (`System.Guid`,
 * `Ref`1[[...]]`, `CellEventInstance` and others are written by hand, not from a template), since
 * the writer would fail on the new item and the whole save could no longer be written.
 */
function defaultOf(save: SaveGame, type: TypeInfo, depth = 0): unknown {
  const code = codeOf(type)
  switch (code) {
    case TypeCode.UserDefined: {
      const template = templatesOf(save).get(type.templateName!)
      if (!template) throw new NoDefault(type.templateName)
      if (depth > 6) {
        // A reference type that nests itself forever is stored as null (length -1) instead.
        if (type.info & IS_VALUE_TYPE) throw new NoDefault(type.templateName)
        return null
      }
      const out: Record<string, unknown> = {}
      for (const m of [...template.fields, ...template.properties]) {
        out[m.name] = defaultOf(save, m.type, depth + 1)
      }
      return out
    }
    case TypeCode.Int64:
    case TypeCode.UInt64:
      return 0n
    case TypeCode.Boolean:
      return false
    case TypeCode.String:
      return ''
    case TypeCode.Vector2I:
    case TypeCode.Vector2:
      return { x: 0, y: 0 }
    case TypeCode.Vector3:
      return { x: 0, y: 0, z: 0 }
    case TypeCode.Colour:
      return { r: 0, g: 0, b: 0, a: 0 }
    case TypeCode.Pair:
      return {
        key: defaultOf(save, type.subTypes![0]!, depth + 1),
        value: defaultOf(save, type.subTypes![1]!, depth + 1),
      }
    case TypeCode.Dictionary:
      return []
    default:
      if (COLLECTIONS.includes(code)) {
        return codeOf(type.subTypes![0]!) === TypeCode.Byte ? new Uint8Array(0) : []
      }
      // Integers, floats and enumerations.
      return 0
  }
}

/**
 * The value "add item" appends to the array at `path`, taken from the save's own template
 * definitions, or null when the array's element type cannot be known or any type reachable from
 * it has no template in the save (the writer could not write the new item then).
 *
 * Only arrays reached through a template are offered: the world, settings and game data roots
 * and each behavior's template data. Elsewhere (the header JSON, extra data the parser decodes
 * by hand) the element type is a guess from siblings, and a wrong guess would write a save the
 * game cannot read. Byte arrays and dictionaries are not offered either: bytes are read-only in
 * the editor, and a dictionary entry needs a key that is not already used.
 */
export function rawDefaultItem(save: SaveGame, arrayPath: RawPath): { value: unknown } | null {
  const element = elementTypeOf(save, arrayPath)
  if (!element) return null
  try {
    return { value: defaultOf(save, element) }
  } catch (error) {
    if (error instanceof NoDefault) return null
    throw error
  }
}

// Whether a type can be defaulted depends only on the templates, so it is worth remembering:
// the editor asks once per array row it draws.
const feasible = new WeakMap<TypeInfo, boolean>()

/** Whether `rawDefaultItem` would offer an item, without building it. */
export function rawCanAdd(save: SaveGame, arrayPath: RawPath): boolean {
  const element = elementTypeOf(save, arrayPath)
  if (!element) return false
  let ok = feasible.get(element)
  if (ok === undefined) {
    ok = rawDefaultItem(save, arrayPath) !== null
    feasible.set(element, ok)
  }
  return ok
}

function elementTypeOf(save: SaveGame, arrayPath: RawPath): TypeInfo | null {
  let node: unknown = save
  for (const key of arrayPath) {
    if (node === null || typeof node !== 'object') return null
    node = (node as Record<string | number, unknown>)[key]
  }
  if (!Array.isArray(node)) return null
  const type = typeAt(save, arrayPath)
  if (!type || !COLLECTIONS.includes(codeOf(type))) return null
  const element = type.subTypes![0]!
  return codeOf(element) === TypeCode.Byte ? null : element
}
