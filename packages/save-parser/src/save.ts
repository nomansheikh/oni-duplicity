import { unzlibSync, zlibSync } from 'fflate'
import { ParseError, Reader, Writer } from './binary.ts'
import { parseBody, writeBody } from './save/body.ts'
import { checkVersion, readHeader, writeHeader, type ParseOptions } from './save/header.ts'
import { readTemplates, writeTemplates } from './templates.ts'
import type { SaveGame, SaveHeader, Template } from './types.ts'

export { MAX_VERIFIED_MINOR, MIN_MINOR, SUPPORTED_MAJOR } from './save/header.ts'
export { parseBody, writeBody }
export type { ParseOptions }

/** Split a save file into header, templates and the decompressed body. */
export function readSaveParts(input: ArrayBuffer | Uint8Array): {
  header: SaveHeader
  templates: Template[]
  body: Uint8Array
} {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const r = new Reader(bytes)
  const header = readHeader(r)
  r.context = 'templates'
  const templates = readTemplates(r)
  const rest = r.bytesView(r.remaining)
  let body: Uint8Array
  try {
    body = header.isCompressed ? unzlibSync(rest) : rest
  } catch (error) {
    throw new ParseError(`Could not decompress the save body: ${(error as Error).message}`, r.pos)
  }
  return { header, templates, body }
}

export function parseSave(input: ArrayBuffer | Uint8Array, options: ParseOptions = {}): SaveGame {
  const warnings: string[] = []
  const { header, templates, body } = readSaveParts(input)
  checkVersion(header, options, warnings)
  const parsed = parseBody(body, templates, options.onProgress)
  if (
    parsed.version.major !== header.gameInfo.saveMajorVersion ||
    parsed.version.minor !== header.gameInfo.saveMinorVersion
  ) {
    warnings.push(
      `Body version ${parsed.version.major}.${parsed.version.minor} differs from header version ${header.gameInfo.saveMajorVersion}.${header.gameInfo.saveMinorVersion}.`,
    )
  }
  return { header, templates, ...parsed, warnings }
}

/** Header plus templates, and the uncompressed body, for callers that compress themselves. */
export function writeSaveParts(save: SaveGame): { head: Uint8Array; body: Uint8Array } {
  const w = new Writer(1 << 16)
  writeHeader(w, save.header)
  writeTemplates(w, save.templates)
  return { head: w.finish(), body: writeBody(save) }
}

export function writeSave(save: SaveGame): Uint8Array {
  const { head, body } = writeSaveParts(save)
  const payload = save.header.isCompressed ? zlibSync(body, { level: 1 }) : body
  const out = new Uint8Array(head.length + payload.length)
  out.set(head)
  out.set(payload, head.length)
  return out
}
