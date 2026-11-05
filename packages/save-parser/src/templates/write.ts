import type { Writer } from '../binary.ts'
import {
  IS_VALUE_TYPE,
  TYPE_CODE_MASK,
  TypeCode,
  type TemplateData,
  type TypeInfo,
} from '../types.ts'
import type { Colour, TemplateMap } from './shared.ts'

export function writeTemplateData(
  w: Writer,
  templates: TemplateMap,
  name: string,
  data: TemplateData,
): void {
  const template = templates.get(name)
  if (!template) throw new Error(`No template named "${name}"`)
  for (const m of template.fields) writeValue(w, templates, m.type, data[m.name])
  for (const m of template.properties) writeValue(w, templates, m.type, data[m.name])
}

function writeCollection(w: Writer, templates: TemplateMap, type: TypeInfo, value: unknown): void {
  if (value === null || value === undefined) {
    w.i32(0)
    w.i32(-1)
    return
  }
  const element = type.subTypes![0]!
  const code = element.info & TYPE_CODE_MASK
  const at = w.beginLength()
  if (code === TypeCode.Byte) {
    const bytes = value as Uint8Array
    w.i32(bytes.length)
    w.bytes(bytes)
    w.endLength(at, at + 8)
    return
  }
  {
    const items = value as unknown[]
    w.i32(items.length)
    if (element.info & IS_VALUE_TYPE) {
      for (const item of items) {
        writeTemplateData(w, templates, element.templateName!, item as TemplateData)
      }
    } else {
      for (const item of items) writeValue(w, templates, element, item)
    }
  }
  w.endLength(at, at + 8)
}

export function writeValue(
  w: Writer,
  templates: TemplateMap,
  type: TypeInfo,
  value: unknown,
): void {
  switch (type.info & TYPE_CODE_MASK) {
    case TypeCode.UserDefined: {
      if (value === null || value === undefined) {
        w.i32(-1)
        return
      }
      const at = w.beginLength()
      writeTemplateData(w, templates, type.templateName!, value as TemplateData)
      w.endLength(at)
      return
    }
    case TypeCode.SByte:
      return w.i8(value as number)
    case TypeCode.Byte:
      return w.u8(value as number)
    case TypeCode.Boolean:
      return w.u8(value ? 1 : 0)
    case TypeCode.Int16:
      return w.i16(value as number)
    case TypeCode.UInt16:
      return w.u16(value as number)
    case TypeCode.Int32:
    case TypeCode.Enumeration:
      return w.i32(value as number)
    case TypeCode.UInt32:
      return w.u32(value as number)
    case TypeCode.Int64:
      return w.i64(value as bigint)
    case TypeCode.UInt64:
      return w.u64(value as bigint)
    case TypeCode.Single:
      return w.f32(value as number)
    case TypeCode.Double:
      return w.f64(value as number)
    case TypeCode.String:
      return w.string(value as string | null)
    case TypeCode.Vector2I: {
      const v = value as { x: number; y: number }
      w.i32(v.x)
      w.i32(v.y)
      return
    }
    case TypeCode.Vector2: {
      const v = value as { x: number; y: number }
      w.f32(v.x)
      w.f32(v.y)
      return
    }
    case TypeCode.Vector3: {
      const v = value as { x: number; y: number; z: number }
      w.f32(v.x)
      w.f32(v.y)
      w.f32(v.z)
      return
    }
    case TypeCode.Colour: {
      const c = value as Colour
      w.u8(c.r)
      w.u8(c.g)
      w.u8(c.b)
      w.u8(c.a)
      return
    }
    case TypeCode.Array:
    case TypeCode.List:
    case TypeCode.HashSet:
    case TypeCode.Queue:
      return writeCollection(w, templates, type, value)
    case TypeCode.Pair: {
      if (value === null || value === undefined) {
        w.i32(-1)
        return
      }
      const [keyType, valueType] = type.subTypes!
      const pair = value as { key: unknown; value: unknown }
      const at = w.beginLength()
      writeValue(w, templates, keyType!, pair.key)
      writeValue(w, templates, valueType!, pair.value)
      w.endLength(at)
      return
    }
    case TypeCode.Dictionary: {
      if (value === null || value === undefined) {
        w.i32(0)
        w.i32(-1)
        return
      }
      const [keyType, valueType] = type.subTypes!
      const entries = value as [unknown, unknown][]
      const at = w.beginLength()
      w.i32(entries.length)
      for (const [, v] of entries) writeValue(w, templates, valueType!, v)
      for (const [k] of entries) writeValue(w, templates, keyType!, k)
      w.endLength(at, at + 8)
      return
    }
    default:
      throw new Error(`Unknown type code ${type.info & TYPE_CODE_MASK}`)
  }
}
