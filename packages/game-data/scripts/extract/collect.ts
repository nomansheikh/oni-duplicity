export const clean = (text: string) => text.replace(/<[^>]+>/g, '').trim()

export const sdbmLower = (s: string) => {
  let h = 0
  for (const ch of s.toLowerCase()) h = (ch.charCodeAt(0) + (h << 6) + (h << 16) - h) | 0
  return h
}

export interface Entry {
  id: string
  name: string
  desc?: string
}

export function collect(
  strings: Map<string, string>,
  literals: Map<string, string[]>,
  prefix: string,
  {
    exactId = false,
    descKeys = ['DESC', 'DESCRIPTION'],
  }: { exactId?: boolean; descKeys?: string[] } = {},
): Entry[] {
  const entries: Entry[] = []
  const re = new RegExp(`^${prefix.replace(/\./g, '\\.')}([A-Z0-9_]+)\\.NAME$`)
  for (const [key, name] of strings) {
    const match = re.exec(key)
    if (!match) continue
    const upper = match[1]!
    const candidates = literals.get(upper) ?? []
    // Prefer a mixed-case literal (the real ID) over an all-caps constant.
    const id = exactId ? upper : (candidates.find((c) => c !== upper) ?? candidates[0])
    if (!id) continue
    const desc = descKeys.map((k) => strings.get(`${prefix}${upper}.${k}`)).find(Boolean)
    entries.push({ id, name: clean(name), ...(desc ? { desc: clean(desc) } : {}) })
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name))
}
