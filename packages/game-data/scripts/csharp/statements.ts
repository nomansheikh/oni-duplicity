import { matchClose } from './source.ts'

export type Stmt =
  | { k: 'expr'; text: string }
  | { k: 'if'; cond: string; then: Stmt[]; else?: Stmt[] }
  | { k: 'foreach'; varName: string; source: string; body: Stmt[] }
  | { k: 'block'; body: Stmt[] }
  | { k: 'return'; text?: string }
  | { k: 'skip' }

function findSemiTop(src: string, from: number): number {
  let depth = 0
  for (let i = from; i < src.length; i += 1) {
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
    else if (c === ';' && depth === 0) return i
  }
  return src.length
}

export function parseStatements(src: string): Stmt[] {
  const out: Stmt[] = []
  let i = 0
  const one = (): Stmt => {
    while (i < src.length && /\s/.test(src[i]!)) i += 1
    const rest = src.slice(i)
    if (rest.startsWith('{')) {
      const close = matchClose(src, i)
      const body = parseStatements(src.slice(i + 1, close))
      i = close + 1
      return { k: 'block', body }
    }
    const kw =
      /^(if|else|foreach|for|while|using|switch|try|lock|do|return|break|continue|throw)\b/.exec(
        rest,
      )?.[1]
    if (kw === 'if') {
      const open = i + rest.indexOf('(')
      const close = matchClose(src, open)
      const cond = src.slice(open + 1, close)
      i = close + 1
      const then = asList(one())
      let alt: Stmt[] | undefined
      const next = /^\s*else\b/.exec(src.slice(i))
      if (next) {
        i += next[0].length
        alt = asList(one())
      }
      return { k: 'if', cond, then, ...(alt ? { else: alt } : {}) }
    }
    if (kw === 'foreach') {
      const open = i + rest.indexOf('(')
      const close = matchClose(src, open)
      const header = src.slice(open + 1, close)
      i = close + 1
      const m = /^\s*(?:var|[\w.<>[\],?\s]+?)\s+(\w+)\s+in\s+([\s\S]*)$/.exec(header)
      const body = asList(one())
      if (!m) return { k: 'skip' }
      return { k: 'foreach', varName: m[1]!, source: m[2]!, body }
    }
    if (kw === 'for' || kw === 'while' || kw === 'switch' || kw === 'lock') {
      const open = i + rest.indexOf('(')
      i = matchClose(src, open) + 1
      one()
      return { k: 'skip' }
    }
    if (kw === 'using') {
      const open = i + rest.indexOf('(')
      const close = matchClose(src, open)
      const header = src.slice(open + 1, close)
      i = close + 1
      const body = one()
      const m = /^\s*(?:var|[\w.<>[\],?\s]+?)\s+(\w+)\s*=\s*([\s\S]*)$/.exec(header)
      if (m) return { k: 'block', body: [{ k: 'expr', text: header }, ...asList(body)] }
      return body
    }
    if (kw === 'try') {
      i += 3
      const body = one()
      for (;;) {
        const c = /^\s*(catch|finally)\b/.exec(src.slice(i))
        if (!c) break
        i += c[0].length
        const p = /^\s*\(/.exec(src.slice(i))
        if (p) i = matchClose(src, i + p[0].length - 1) + 1
        one()
      }
      return body
    }
    if (kw === 'do') {
      i += 2
      one()
      const w = /^\s*while\s*\(/.exec(src.slice(i))
      if (w) i = matchClose(src, i + w[0].length - 1) + 1
      const semi = src.indexOf(';', i)
      i = semi + 1
      return { k: 'skip' }
    }
    const semi = findSemiTop(src, i)
    const text = src.slice(i, semi).trim()
    i = semi + 1
    if (kw === 'return')
      return { k: 'return', ...(text.length > 6 ? { text: text.slice(6).trim() } : {}) }
    if (kw === 'break' || kw === 'continue' || kw === 'throw') return { k: 'skip' }
    return { k: 'expr', text }
  }
  while (true) {
    while (i < src.length && /[\s;]/.test(src[i]!)) i += 1
    if (i >= src.length) break
    out.push(one())
  }
  return out
}

const asList = (s: Stmt): Stmt[] => (s.k === 'block' ? s.body : [s])
