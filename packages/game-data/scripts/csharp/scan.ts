import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Blanks out comments, keeping string and char literals (and line breaks) intact. */
export function stripComments(src: string): string {
  let out = ''
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i]!
    const n = src[i + 1]
    if (c === '"' || c === "'") {
      const verbatim = c === '"' && src[i - 1] === '@'
      let j = i + 1
      while (j < src.length) {
        if (!verbatim && src[j] === '\\') j += 2
        else if (src[j] === c) {
          if (verbatim && src[j + 1] === '"') j += 2
          else break
        } else j += 1
      }
      out += src.slice(i, j + 1)
      i = j
    } else if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i += 1
      out += '\n'
    } else if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2)
      i = end < 0 ? src.length : end + 1
    } else out += c
  }
  return out
}

/** Index of the brace/paren/bracket closing the one at `open`, skipping literals. */
export function matchClose(src: string, open: number): number {
  const pairs: Record<string, string> = { '{': '}', '(': ')', '[': ']' }
  const stack: string[] = []
  for (let i = open; i < src.length; i += 1) {
    const c = src[i]!
    if (c === '"' || c === "'") {
      const verbatim = c === '"' && src[i - 1] === '@'
      i += 1
      while (i < src.length) {
        if (!verbatim && src[i] === '\\') i += 2
        else if (src[i] === c) {
          if (verbatim && src[i + 1] === '"') i += 2
          else break
        } else i += 1
      }
    } else if (pairs[c]) stack.push(pairs[c]!)
    else if (c === '}' || c === ')' || c === ']') {
      stack.pop()
      if (stack.length === 0) return i
    }
  }
  return -1
}

/** Splits on top-level commas (outside any bracket pair, generics and literals). */
export function splitTop(src: string, sep = ','): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i]!
    if (c === '"' || c === "'") {
      const verbatim = c === '"' && src[i - 1] === '@'
      i += 1
      while (i < src.length) {
        if (!verbatim && src[i] === '\\') i += 2
        else if (src[i] === c) {
          if (verbatim && src[i + 1] === '"') i += 2
          else break
        } else i += 1
      }
    } else if (c === '(' || c === '[' || c === '{') depth += 1
    else if (c === ')' || c === ']' || c === '}') depth -= 1
    else if (c === '<' && sep === ',' && /[A-Za-z_]/.test(src[i - 1] ?? '')) {
      // Generic argument list such as Dictionary<string, float>: skip to its closing '>'.
      const m = /^<[A-Za-z0-9_.,<>[\]\s?]*>/.exec(src.slice(i))
      if (m && !/\s>\s/.test(m[0])) {
        i += m[0].length - 1
      }
    } else if (c === sep && depth === 0) {
      parts.push(src.slice(start, i))
      start = i + 1
    }
  }
  const last = src.slice(start)
  if (last.trim() !== '' || parts.length > 0) parts.push(last)
  return parts.map((p) => p.trim()).filter((p, i, all) => p !== '' || i < all.length - 1)
}

export function findSemi(body: string, from: number): number {
  let depth = 0
  for (let i = from; i < body.length; i += 1) {
    const c = body[i]!
    if (c === '"' || c === "'") {
      const verbatim = c === '"' && body[i - 1] === '@'
      i += 1
      while (i < body.length) {
        if (!verbatim && body[i] === '\\') i += 2
        else if (body[i] === c) {
          if (verbatim && body[i + 1] === '"') i += 2
          else break
        } else i += 1
      }
    } else if (c === '(' || c === '[' || c === '{') depth += 1
    else if (c === ')' || c === ']' || c === '}') depth -= 1
    else if (c === ';' && depth === 0) return i
  }
  return body.length
}

export function walk(dir: string): string[] {
  const files: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) files.push(...walk(path))
    else if (name.endsWith('.cs')) files.push(path)
  }
  return files
}
