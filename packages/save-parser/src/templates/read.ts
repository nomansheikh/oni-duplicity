import type { Reader } from '../binary.ts'
import {
  IS_VALUE_TYPE,
  TYPE_CODE_MASK,
  TypeCode,
  type TemplateData,
  type TypeInfo,
} from '../types.ts'
import type { Colour, TemplateMap } from './shared.ts'

export function readTemplateData(r: Reader, templates: TemplateMap, name: string): TemplateData {
  const template = templates.get(name)
  if (!template) r.fail(`No template named "${name}"`)
  const data: TemplateData = {}
  for (const m of template.fields) data[m.name] = readValue(r, templates, m.type)
  for (const m of template.properties) data[m.name] = readValue(r, templates, m.type)
  return data
}

/** Collections store an int32 byte length (excluding the count), then an int32 count. */
function readCollection(r: Reader, templates: TemplateMap, type: TypeInfo): unknown {
  r.i32() // byte length
  const count = r.i32()
  if (count === -1) return null
  if (count < 0) r.fail(`Invalid collection count ${count}`)
  const element = type.subTypes![0]!
  const code = element.info & TYPE_CODE_MASK
  if (code === TypeCode.Byte) return r.bytesView(count)
  if (count > r.remaining) r.fail(`Collection count ${count} exceeds remaining data`)
  const items: unknown[] = new Array(count)
  if (element.info & IS_VALUE_TYPE) {
    if (code !== TypeCode.UserDefined) r.fail(`Unsupported value-type element code ${code}`)
    for (let i = 0; i < count; i++) items[i] = readTemplateData(r, templates, element.templateName!)
  } else {
    for (let i = 0; i < count; i++) items[i] = readValue(r, templates, element)
  }
  return items
}

export function readValue(r: Reader, templates: TemplateMap, type: TypeInfo): unknown {
  switch (type.info & TYPE_CODE_MASK) {
    case TypeCode.UserDefined: {
      const length = r.i32()
      if (length < 0) return null
      const start = r.pos
      const data = readTemplateData(r, templates, type.templateName!)
      if (r.pos - start !== length) {
        r.fail(`"${type.templateName}" read ${r.pos - start} bytes, expected ${length}`)
      }
      return data
    }
    case TypeCode.SByte:
      return r.i8()
    case TypeCode.Byte:
      return r.u8()
    case TypeCode.Boolean:
      return r.u8() !== 0
    case TypeCode.Int16:
      return r.i16()
    case TypeCode.UInt16:
      return r.u16()
    case TypeCode.Int32:
    case TypeCode.Enumeration:
      return r.i32()
    case TypeCode.UInt32:
      return r.u32()
    case TypeCode.Int64:
      return r.i64()
    case TypeCode.UInt64:
      return r.u64()
    case TypeCode.Single:
      return r.f32()
    case TypeCode.Double:
      return r.f64()
    case TypeCode.String:
      return r.string()
    case TypeCode.Vector2I:
      return { x: r.i32(), y: r.i32() }
    case TypeCode.Vector2:
      return { x: r.f32(), y: r.f32() }
    case TypeCode.Vector3:
      return { x: r.f32(), y: r.f32(), z: r.f32() }
    case TypeCode.Colour:
      return { r: r.u8(), g: r.u8(), b: r.u8(), a: r.u8() } satisfies Colour
    case TypeCode.Array:
    case TypeCode.List:
    case TypeCode.HashSet:
    case TypeCode.Queue:
      return readCollection(r, templates, type)
    case TypeCode.Pair: {
      const length = r.i32()
      if (length < 0) return null
      const [keyType, valueType] = type.subTypes!
      const key = readValue(r, templates, keyType!)
      const value = readValue(r, templates, valueType!)
      return { key, value }
    }
    case TypeCode.Dictionary: {
      r.i32() // byte length
      const count = r.i32()
      if (count === -1) return null
      if (count < 0 || count > r.remaining) r.fail(`Invalid dictionary count ${count}`)
      const [keyType, valueType] = type.subTypes!
      // Values are stored before keys.
      const values: unknown[] = new Array(count)
      for (let i = 0; i < count; i++) values[i] = readValue(r, templates, valueType!)
      const entries: [unknown, unknown][] = new Array(count)
      for (let i = 0; i < count; i++) entries[i] = [readValue(r, templates, keyType!), values[i]]
      return entries
    }
    default:
      return r.fail(`Unknown type code ${type.info & TYPE_CODE_MASK}`)
  }
}
