export interface Token {
  t: 'num' | 'str' | 'id' | 'op'
  v: string
}

const OPS = [
  '>>=',
  '<<=',
  '??=',
  '=>',
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '??',
  '?.',
  '++',
  '--',
  '+=',
  '-=',
  '*=',
  '/=',
  '::',
  '<<',
  '>>',
]

export function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]!
    if (/\s/.test(c)) {
      i += 1
    } else if (c === '"' || (c === '@' && src[i + 1] === '"') || c === '$') {
      const verbatim = c === '@'
      if (c === '$') i += 1
      let j = i + (verbatim ? 2 : 1)
      let text = ''
      while (j < src.length) {
        if (!verbatim && src[j] === '\\') {
          const esc = src[j + 1]!
          text += esc === 'n' ? '\n' : esc === 't' ? '\t' : esc
          j += 2
        } else if (src[j] === '"') {
          if (verbatim && src[j + 1] === '"') {
            text += '"'
            j += 2
          } else break
        } else {
          text += src[j]
          j += 1
        }
      }
      tokens.push({ t: 'str', v: text })
      i = j + 1
    } else if (c === "'") {
      let j = i + 1
      let text = ''
      while (j < src.length && src[j] !== "'") {
        if (src[j] === '\\') j += 1
        text += src[j]
        j += 1
      }
      tokens.push({ t: 'str', v: text })
      i = j + 1
    } else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const m = /^(0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)[fFdDmMuUlL]*/.exec(
        src.slice(i),
      )!
      tokens.push({ t: 'num', v: m[1]! })
      i += m[0].length
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_]\w*/.exec(src.slice(i))!
      tokens.push({ t: 'id', v: m[0] })
      i += m[0].length
    } else {
      const op = OPS.find((o) => src.startsWith(o, i)) ?? c
      tokens.push({ t: 'op', v: op })
      i += op.length
    }
  }
  return tokens
}

export function matchTokens(toks: Token[], open: number): number {
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
  const stack: string[] = []
  for (let i = open; i < toks.length; i += 1) {
    const t = toks[i]!
    if (t.t !== 'op') continue
    if (pairs[t.v]) stack.push(pairs[t.v]!)
    else if (t.v === ')' || t.v === ']' || t.v === '}') {
      stack.pop()
      if (stack.length === 0) return i
    }
  }
  return toks.length - 1
}
