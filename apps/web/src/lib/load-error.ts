export type LoadErrorKind = 'not-save' | 'version' | 'truncated' | 'unknown'

export interface LoadErrorInfo {
  kind: LoadErrorKind
  title: string
  hint: string
  message: string
  /** Byte offset from a `ParseError` message, when there is one. */
  offset?: number
  stack?: string
}

const COPY: Record<LoadErrorKind, { title: string; hint: string }> = {
  'not-save': {
    title: "This doesn't look like an ONI save",
    hint: 'Pick a .sav file written by Oxygen Not Included, not a screenshot, backup archive or other file.',
  },
  version: {
    title: 'Unsupported version',
    hint: 'Only saves from the current game versions (7.x) can be read. Load an older save in the game and save it again.',
  },
  truncated: {
    title: 'File is truncated or corrupted',
    hint: 'The file ends early or its data is damaged. Try the game’s backup or autosave copy.',
  },
  unknown: {
    title: 'This save could not be read',
    hint: 'The details below may help if you report the problem.',
  },
}

function kindOf(message: string): LoadErrorKind {
  if (/save version (undefined|NaN)/i.test(message)) return 'not-save'
  // A header is a few hundred bytes; asking for megabytes means the size field is garbage.
  const needed = /needed (\d+) bytes.*in header/.exec(message)?.[1]
  if (needed !== undefined && Number(needed) > 65_536) return 'not-save'
  if (/not valid JSON|not an ONI save|SIMSAVE/i.test(message)) return 'not-save'
  if (/is not supported|too old|newer than/i.test(message)) return 'version'
  if (/unexpected end of data|could not decompress|invalid string length/i.test(message)) {
    return 'truncated'
  }
  return 'unknown'
}

/** Turns whatever the worker threw into something a person can act on. */
export function describeLoadError(error: unknown): LoadErrorInfo {
  const e = error instanceof Error ? error : new Error(String(error))
  const kind = kindOf(e.message)
  const offset = /\(at byte (\d+)/.exec(e.message)?.[1]
  return {
    kind,
    ...COPY[kind],
    message: e.message,
    offset: offset === undefined ? undefined : Number(offset),
    stack: e.stack,
  }
}

/** The details as one block of text for the clipboard. */
export function loadErrorReport(info: LoadErrorInfo): string {
  return [
    info.title,
    info.message,
    info.offset === undefined ? '' : `Offset: ${info.offset}`,
    info.stack ?? '',
  ]
    .filter(Boolean)
    .join('\n')
}
