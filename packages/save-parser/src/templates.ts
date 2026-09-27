import type { Reader, Writer } from './binary.ts'
import {
  IS_GENERIC_TYPE,
  IS_VALUE_TYPE,
  TYPE_CODE_MASK,
  TypeCode,
  type Template,
  type TemplateData,
  type TemplateMember,
  type TypeInfo,
} from './types.ts'

export type TemplateMap = Map<string, Template>

// --- Template definitions -------------------------------------------------

function readTypeInfo(r: Reader): TypeInfo {
  const info = r.u8()
  const code = info & TYPE_CODE_MASK
  const type: TypeInfo = { info }
  if (code === TypeCode.UserDefined || code === TypeCode.Enumeration) {
    type.templateName = r.name()
  }
  if (info & IS_GENERIC_TYPE) {
    const count = r.u8()
    type.subTypes = []
    for (let i = 0; i < count; i++) type.subTypes.push(readTypeInfo(r))
  } else if (code === TypeCode.Array) {
    type.subTypes = [readTypeInfo(r)]
  }
  return type
}

function writeTypeInfo(w: Writer, type: TypeInfo): void {
  w.u8(type.info)
  const code = type.info & TYPE_CODE_MASK
  if (code === TypeCode.UserDefined || code === TypeCode.Enumeration) {
    w.string(type.templateName!)
  }
  if (type.info & IS_GENERIC_TYPE) {
    w.u8(type.subTypes!.length)
    for (const sub of type.subTypes!) writeTypeInfo(w, sub)
  } else if (code === TypeCode.Array) {
    writeTypeInfo(w, type.subTypes![0]!)
  }
}

function readMembers(r: Reader, count: number): TemplateMember[] {
  const members: TemplateMember[] = []
  for (let i = 0; i < count; i++) members.push({ name: r.name(), type: readTypeInfo(r) })
  return members
}

export function readTemplates(r: Reader): Template[] {
  const count = r.i32()
  if (count < 0) r.fail(`Invalid template count ${count}`)
  const templates: Template[] = []
  for (let i = 0; i < count; i++) {
    const name = r.name()
    const fieldCount = r.i32()
    const propertyCount = r.i32()
    const fields = readMembers(r, fieldCount)
    const properties = readMembers(r, propertyCount)
    templates.push({ name, fields, properties })
  }
  return templates
}

export function writeTemplates(w: Writer, templates: Template[]): void {
  w.i32(templates.length)
  for (const t of templates) {
    w.string(t.name)
    w.i32(t.fields.length)
    w.i32(t.properties.length)
    for (const m of [...t.fields, ...t.properties]) {
      w.string(m.name)
      writeTypeInfo(w, m.type)
    }
  }
}

// --- Template data --------------------------------------------------------

export function readTemplateData(r: Reader, templates: TemplateMap, name: string): TemplateData {
  const template = templates.get(name)
  if (!template) r.fail(`No template named "${name}"`)
  const data: TemplateData = {}
  for (const m of template.fields) data[m.name] = readValue(r, templates, m.type)
  for (const m of template.properties) data[m.name] = readValue(r, templates, m.type)
  return data
}

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

export interface Colour {
  r: number
  g: number
  b: number
  a: number
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
