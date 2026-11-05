import type { Reader, Writer } from '../binary.ts'
import {
  IS_GENERIC_TYPE,
  TYPE_CODE_MASK,
  TypeCode,
  type Template,
  type TemplateMember,
  type TypeInfo,
} from '../types.ts'

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
