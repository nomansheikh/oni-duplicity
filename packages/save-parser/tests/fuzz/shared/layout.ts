import { readFileSync } from 'node:fs'
import { Reader } from '../../../src/binary.ts'
import { parseBody, readSaveParts } from '../../../src/save.ts'
import { readTemplateData, readTemplates, type TemplateMap } from '../../../src/templates.ts'

/** Where the regions of a save sit in the file and in the decompressed body. */
export interface Layout {
  file: Uint8Array
  body: Uint8Array
  /** File: header is [0, headerEnd), templates are [headerEnd, templatesEnd), then the zlib stream. */
  headerEnd: number
  templatesEnd: number
  /** Body: world and settings template data [0, simStart); sim blob; objects and game data [objectsStart, end). */
  simStart: number
  objectsStart: number
  /** Body ranges that are opaque payload (sim data, large byte arrays) rather than structure. */
  opaque: [number, number][]
}

/** Payloads at least this long count as opaque; flips inside them rarely test parser logic. */
const OPAQUE_MIN = 256

/** Record every large `bytesView` payload the parser takes from `body` while `fn` runs. */
function recordOpaque(body: Uint8Array, fn: () => void): [number, number][] {
  // eslint-disable-next-line typescript/unbound-method -- called back with the right `this` below
  const original = Reader.prototype.bytesView
  const ranges: [number, number][] = []
  Reader.prototype.bytesView = function (this: Reader, n: number) {
    if (this.bytes === body && n >= OPAQUE_MIN) ranges.push([this.pos, this.pos + n])
    return original.call(this, n)
  }
  try {
    fn()
  } finally {
    Reader.prototype.bytesView = original
  }
  return ranges.sort((a, b) => a[0] - b[0])
}

export function readLayout(path: string): Layout {
  const file = new Uint8Array(readFileSync(path))
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength)
  const headerSize = view.getUint32(4, true)
  const headerVersion = view.getUint32(8, true)
  const headerEnd = 12 + (headerVersion >= 1 ? 4 : 0) + headerSize
  const fileReader = new Reader(file)
  fileReader.pos = headerEnd
  readTemplates(fileReader)
  const templatesEnd = fileReader.pos

  const { body, templates } = readSaveParts(file)
  const map: TemplateMap = new Map(templates.map((t) => [t.name, t]))
  const r = new Reader(body)
  r.name()
  r.name()
  readTemplateData(r, map, 'Klei.SaveFileRoot')
  r.name()
  readTemplateData(r, map, 'Game+Settings')
  const simLength = r.i32()
  const simStart = r.pos
  r.pos += simLength
  r.chars(4)
  r.i32()
  r.i32()
  const opaque = recordOpaque(body, () => void parseBody(body, templates))
  return { file, body, headerEnd, templatesEnd, simStart, objectsStart: r.pos, opaque }
}
