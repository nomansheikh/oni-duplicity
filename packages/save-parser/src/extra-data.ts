import { Reader, Writer } from './binary.ts'
import { readTemplateData, writeTemplateData, type TemplateMap } from './templates.ts'
import type { TemplateData } from './types.ts'

/** One entry of a Klei `Modifications` list, e.g. the "Stress" amount. */
export interface ModifierInstance {
  name: string
  value: TemplateData
}

/** Extra data of `MinionModifiers` and `Klei.AI.Modifiers`: amounts, then sicknesses. */
export interface ModifiersExtraData {
  amounts: ModifierInstance[]
  sicknesses: ModifierInstance[]
}

interface ExtraDataCodec {
  read(r: Reader, templates: TemplateMap): unknown
  write(w: Writer, templates: TemplateMap, value: unknown): void
}

function readInstances(r: Reader, templates: TemplateMap, template: string): ModifierInstance[] {
  const count = r.i32()
  if (count < 0 || count > r.remaining) r.fail(`Invalid modifier count ${count}`)
  const items: ModifierInstance[] = []
  for (let i = 0; i < count; i++) {
    const name = r.name()
    const length = r.i32()
    const start = r.pos
    const value = readTemplateData(r, templates, template)
    if (r.pos - start !== length)
      r.fail(`Modifier "${name}" read ${r.pos - start} bytes, expected ${length}`)
    items.push({ name, value })
  }
  return items
}

function writeInstances(
  w: Writer,
  templates: TemplateMap,
  template: string,
  items: ModifierInstance[],
): void {
  w.i32(items.length)
  for (const item of items) {
    w.string(item.name)
    const at = w.beginLength()
    writeTemplateData(w, templates, template, item.value)
    w.endLength(at)
  }
}

const modifiers: ExtraDataCodec = {
  read: (r, templates) => ({
    amounts: readInstances(r, templates, 'Klei.AI.AmountInstance'),
    sicknesses: readInstances(r, templates, 'Klei.AI.SicknessInstance'),
  }),
  write: (w, templates, value) => {
    const data = value as ModifiersExtraData
    writeInstances(w, templates, 'Klei.AI.AmountInstance', data.amounts)
    writeInstances(w, templates, 'Klei.AI.SicknessInstance', data.sicknesses)
  },
}

const CODECS: Record<string, ExtraDataCodec> = {
  MinionModifiers: modifiers,
  'Klei.AI.Modifiers': modifiers,
}

/**
 * Decode the extra data at `bytes` if we know the behavior and the decoded value re-encodes to the
 * exact same bytes; otherwise return undefined and the caller keeps the bytes raw.
 */
export function decodeExtraData(
  behavior: string,
  bytes: Uint8Array,
  templates: TemplateMap,
): { value: unknown; consumed: number } | undefined {
  const codec = CODECS[behavior]
  if (!codec || bytes.length === 0) return undefined
  try {
    const r = new Reader(bytes)
    const value = codec.read(r, templates)
    const w = new Writer(Math.max(64, r.pos))
    codec.write(w, templates, value)
    const encoded = w.finish()
    if (encoded.length !== r.pos) return undefined
    for (let i = 0; i < encoded.length; i++) if (encoded[i] !== bytes[i]) return undefined
    return { value, consumed: r.pos }
  } catch {
    return undefined
  }
}

export function encodeExtraData(
  behavior: string,
  w: Writer,
  templates: TemplateMap,
  value: unknown,
): void {
  const codec = CODECS[behavior]
  if (!codec) throw new Error(`No extra-data codec for "${behavior}"`)
  codec.write(w, templates, value)
}
