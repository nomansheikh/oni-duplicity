import { ParseError, type Reader, type Writer } from '../binary.ts'
import type { SaveHeader } from '../types.ts'

export const SUPPORTED_MAJOR = 7
export const MIN_MINOR = 31
export const MAX_VERIFIED_MINOR = 38

export interface ParseOptions {
  /** Throw instead of warning when the save is newer than the verified range. */
  strictVersion?: boolean
  onProgress?: (fraction: number) => void
}

const utf8 = new TextDecoder('utf-8')
const utf8Encoder = new TextEncoder()

export function readHeader(r: Reader): SaveHeader {
  r.context = 'header'
  const buildVersion = r.u32()
  const headerSize = r.u32()
  const headerVersion = r.u32()
  const isCompressed = headerVersion >= 1 ? r.u32() !== 0 : false
  const json = utf8.decode(r.bytesView(headerSize))
  let gameInfo: SaveHeader['gameInfo']
  try {
    gameInfo = JSON.parse(json)
  } catch {
    return r.fail('Header is not valid JSON; this is probably not an ONI save file')
  }
  return { buildVersion, headerVersion, isCompressed, gameInfo }
}

export function writeHeader(w: Writer, header: SaveHeader): void {
  const json = utf8Encoder.encode(JSON.stringify(header.gameInfo))
  w.u32(header.buildVersion)
  w.u32(json.length)
  w.u32(header.headerVersion)
  if (header.headerVersion >= 1) w.u32(header.isCompressed ? 1 : 0)
  w.bytes(json)
}

export function checkVersion(header: SaveHeader, options: ParseOptions, warnings: string[]): void {
  const major = header.gameInfo.saveMajorVersion
  const minor = header.gameInfo.saveMinorVersion
  if (major !== SUPPORTED_MAJOR) {
    throw new ParseError(`Save version ${major}.${minor} is not supported (need 7.x)`, 0, 'header')
  }
  if (minor < MIN_MINOR) {
    throw new ParseError(
      `Save version ${major}.${minor} is too old. Load it in the current game and save again.`,
      0,
      'header',
    )
  }
  if (minor > MAX_VERIFIED_MINOR) {
    const message = `Save version ${major}.${minor} is newer than the verified 7.${MIN_MINOR}–7.${MAX_VERIFIED_MINOR}.`
    if (options.strictVersion) throw new ParseError(message, 0, 'header')
    warnings.push(message)
  }
}
