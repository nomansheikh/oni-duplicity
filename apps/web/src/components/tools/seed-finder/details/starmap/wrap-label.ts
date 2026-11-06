/** Splits a name into lines of about `width` characters at word breaks, for a hex label. */
export function wrapLabel(name: string, width: number): string[] {
  const lines: string[] = []
  for (const word of name.split(' ')) {
    const last = lines.at(-1)
    if (last !== undefined && last.length + 1 + word.length <= width)
      lines[lines.length - 1] = `${last} ${word}`
    else lines.push(word)
  }
  return lines
}
