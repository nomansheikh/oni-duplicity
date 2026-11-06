import { readFileSync } from 'node:fs'

/** msgctxt → msgid from a gettext template. */
export function readPot(path: string): Map<string, string> {
  const unquote = (s: string) => JSON.parse(s) as string
  const entries = new Map<string, string>()
  let ctxt: string | null = null
  let target: 'ctxt' | 'id' | null = null
  let id = ''
  const flush = () => {
    if (ctxt !== null) entries.set(ctxt, id)
    ctxt = null
    id = ''
  }
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.startsWith('msgctxt ')) {
      flush()
      ctxt = unquote(line.slice(8))
      target = 'ctxt'
    } else if (line.startsWith('msgid ')) {
      id = unquote(line.slice(6))
      target = 'id'
    } else if (line.startsWith('"') && target === 'id') {
      id += unquote(line)
    } else if (line.startsWith('msgstr')) {
      target = null
    }
  }
  flush()
  return entries
}
