import type { Reader, Writer } from './binary.ts'
import { decodeExtraData, encodeExtraData } from './extra-data.ts'
import { readTemplateData, writeTemplateData, type TemplateMap } from './templates.ts'
import type { Behavior, GameObject, TemplateData } from './types.ts'

export function readBehavior(r: Reader, templates: TemplateMap, group: string): Behavior {
  const name = r.name()
  r.context = `${group} > ${name}`
  const length = r.i32()
  if (length < 0 || length > r.remaining) r.fail(`Invalid behavior length ${length}`)
  const end = r.pos + length
  let templateData: TemplateData | null = null
  if (templates.has(name)) {
    templateData = readTemplateData(r, templates, name)
    if (r.pos > end) r.fail(`Behavior data overran its length by ${r.pos - end} bytes`)
  }
  let extraData: unknown
  if (templateData) {
    const decoded = decodeExtraData(name, r.bytes.subarray(r.pos, end), templates)
    if (decoded) {
      extraData = decoded.value
      r.pos += decoded.consumed
    }
  }
  const extraRaw = r.bytesView(end - r.pos)
  return extraData === undefined
    ? { name, templateData, extraRaw }
    : { name, templateData, extraData, extraRaw }
}

export function readGameObject(r: Reader, templates: TemplateMap, group: string): GameObject {
  const position = { x: r.f32(), y: r.f32(), z: r.f32() }
  const rotation = { x: r.f32(), y: r.f32(), z: r.f32(), w: r.f32() }
  const scale = { x: r.f32(), y: r.f32(), z: r.f32() }
  const folder = r.u8()
  const count = r.i32()
  if (count < 0 || count > r.remaining) r.fail(`Invalid behavior count ${count}`)
  const behaviors: Behavior[] = []
  for (let i = 0; i < count; i++) behaviors.push(readBehavior(r, templates, group))
  return { position, rotation, scale, folder, behaviors }
}

export function writeGameObject(w: Writer, templates: TemplateMap, obj: GameObject): void {
  const { position: p, rotation: q, scale: s } = obj
  w.f32(p.x)
  w.f32(p.y)
  w.f32(p.z)
  w.f32(q.x)
  w.f32(q.y)
  w.f32(q.z)
  w.f32(q.w)
  w.f32(s.x)
  w.f32(s.y)
  w.f32(s.z)
  w.u8(obj.folder)
  w.i32(obj.behaviors.length)
  for (const behavior of obj.behaviors) {
    w.string(behavior.name)
    const at = w.beginLength()
    if (behavior.templateData) writeTemplateData(w, templates, behavior.name, behavior.templateData)
    if (behavior.extraData !== undefined)
      encodeExtraData(behavior.name, w, templates, behavior.extraData)
    w.bytes(behavior.extraRaw)
    w.endLength(at)
  }
}
