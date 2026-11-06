/** Game text without rich-text markup; list bullets become a comma list. */
export function plain(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/:\s*\n\s*•?\s*/g, ': ')
    .replace(/\s*\n\s*•?\s*/g, ', ')
    .trim()
}

/** Looks a key up in the strings table, failing loudly instead of writing a blank. */
export function lookup(strings: Map<string, string>, key: string): string {
  const value = strings.get(key)
  if (value === undefined) throw new Error(`String ${key} not found`)
  return value
}
