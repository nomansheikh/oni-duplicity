/**
 * A tiny interpreter for the subset of C# that the game's entity configs are written in:
 * static fields, arithmetic, collection initialisers, `new` of plain data classes, and
 * straight-line methods with `if` and `foreach`. Calls into the engine (EntityTemplates,
 * Db, Assets, ...) are not run; the host registers natives for the few it needs to observe.
 * Anything it cannot evaluate becomes `undefined`/`Ref` and is dropped by the caller.
 */
import {
  matchClose,
  splitTop,
  type ClassInfo,
  type MethodInfo,
  type SourceIndex,
} from './source.ts'

/** A chain the interpreter could not resolve; its text is kept so callers can recognise it. */
export class Ref {
  readonly path: string
  constructor(path: string) {
    this.path = path
  }
  toString() {
    return this.path
  }
}

export class ClassRef {
  readonly classes: ClassInfo[]
  constructor(classes: ClassInfo[]) {
    this.classes = classes
  }
}

class NsRef {
  readonly name: string
  constructor(name: string) {
    this.name = name
  }
}

export interface Obj {
  $type: string
  $class?: ClassInfo
  [key: string]: unknown
}

export type Value =
  | number
  | string
  | boolean
  | null
  | undefined
  | Ref
  | ClassRef
  | NsRef
  | Obj
  | Value[]
  | ((args: Value[]) => Value)

export class Env {
  readonly vars = new Map<string, Value>()
  readonly parent?: Env
  readonly cls?: ClassInfo
  readonly self?: Obj
  constructor(parent?: Env, cls?: ClassInfo, self?: Obj) {
    if (parent) this.parent = parent
    if (cls) this.cls = cls
    if (self) this.self = self
  }
  lookup(name: string): { found: boolean; value?: Value } {
    for (let e: Env | undefined = this; e; e = e.parent) {
      if (e.vars.has(name)) return { found: true, value: e.vars.get(name) }
    }
    return { found: false }
  }
  assign(name: string, value: Value): boolean {
    for (let e: Env | undefined = this; e; e = e.parent) {
      if (e.vars.has(name)) {
        e.vars.set(name, value)
        return true
      }
    }
    return false
  }
  get currentClass(): ClassInfo | undefined {
    for (let e: Env | undefined = this; e; e = e.parent) if (e.cls) return e.cls
    return undefined
  }
  get currentSelf(): Obj | undefined {
    for (let e: Env | undefined = this; e; e = e.parent) if (e.self) return e.self
    return undefined
  }
}

// ---------------------------------------------------------------------------------------------
// Tokens and AST
// ---------------------------------------------------------------------------------------------

interface Token {
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

function tokenize(src: string): Token[] {
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

type Node =
  | { k: 'lit'; v: Value }
  | { k: 'id'; name: string }
  | { k: 'member'; obj: Node; name: string }
  | { k: 'call'; callee: Node; args: Node[]; generic?: string }
  | { k: 'index'; obj: Node; idx: Node }
  | { k: 'new'; type: string; args?: Node[]; init?: InitItem[]; array: boolean }
  | { k: 'unary'; op: string; e: Node }
  | { k: 'bin'; op: string; l: Node; r: Node }
  | { k: 'cond'; c: Node; a: Node; b: Node }
  | { k: 'cast'; type: string; e: Node }
  | { k: 'lambda'; params: string[]; body: Node }
  | { k: 'unknown' }

type InitItem = { name: string; value: Node } | { value: Node }

const CAST_TYPES = new Set([
  'float',
  'int',
  'double',
  'long',
  'byte',
  'short',
  'uint',
  'string',
  'object',
  'SimHashes',
  'Tag',
])

class Parser {
  private pos = 0
  private readonly toks: Token[]
  constructor(toks: Token[]) {
    this.toks = toks
  }

  private get cur(): Token | undefined {
    return this.toks[this.pos]
  }
  private isOp(v: string, off = 0) {
    const t = this.toks[this.pos + off]
    return t?.t === 'op' && t.v === v
  }
  private eat(v: string) {
    if (this.isOp(v)) {
      this.pos += 1
      return true
    }
    return false
  }
  private expect(v: string) {
    if (!this.eat(v)) throw new Error(`expected ${v} at ${this.pos}: ${this.cur?.v}`)
  }
  get done() {
    return this.pos >= this.toks.length
  }

  parseAll(): Node {
    const n = this.expr()
    if (!this.done) throw new Error(`trailing tokens: ${this.cur?.v}`)
    return n
  }

  expr(): Node {
    return this.ternary()
  }

  private ternary(): Node {
    const c = this.binary(0)
    if (this.eat('?')) {
      const a = this.ternary()
      this.expect(':')
      const b = this.ternary()
      return { k: 'cond', c, a, b }
    }
    return c
  }

  private static readonly LEVELS: string[][] = [
    ['??'],
    ['||'],
    ['&&'],
    ['==', '!='],
    ['<', '>', '<=', '>=', 'is', 'as'],
    ['+', '-'],
    ['*', '/', '%'],
  ]

  private binary(level: number): Node {
    if (level >= Parser.LEVELS.length) return this.unary()
    let left = this.binary(level + 1)
    for (;;) {
      const t = this.cur
      if (!t || !Parser.LEVELS[level]!.includes(t.v) || (t.t !== 'op' && t.t !== 'id')) break
      this.pos += 1
      if (t.v === 'as' || t.v === 'is') {
        this.skipType()
        left = t.v === 'as' ? left : { k: 'lit', v: false }
        continue
      }
      const right = this.binary(level + 1)
      left = { k: 'bin', op: t.v, l: left, r: right }
    }
    return left
  }

  private skipType() {
    while (this.cur?.t === 'id' || this.isOp('.') || this.isOp('?')) this.pos += 1
    if (this.isOp('<')) this.skipGeneric()
    while (this.isOp('[') && this.isOp(']', 1)) this.pos += 2
  }

  private skipGeneric(): string {
    let depth = 0
    let text = ''
    do {
      const t = this.cur!
      if (t.v === '<') depth += 1
      else if (t.v === '>') depth -= 1
      else if (t.v === '>>') depth -= 2
      text += t.v
      this.pos += 1
    } while (depth > 0 && this.cur)
    return text.slice(1, -1)
  }

  private unary(): Node {
    const t = this.cur
    if (t?.t === 'op' && (t.v === '!' || t.v === '-' || t.v === '+')) {
      this.pos += 1
      return { k: 'unary', op: t.v, e: this.unary() }
    }
    if (t?.t === 'op' && t.v === '(' && this.looksLikeCast()) {
      this.pos += 1
      let type = ''
      while (!this.isOp(')')) {
        type += this.cur!.v
        this.pos += 1
      }
      this.pos += 1
      return { k: 'cast', type, e: this.unary() }
    }
    return this.postfix()
  }

  private looksLikeCast(): boolean {
    let i = this.pos + 1
    let name = ''
    while (this.toks[i] && (this.toks[i]!.t === 'id' || this.toks[i]!.v === '.')) {
      name += this.toks[i]!.v
      i += 1
    }
    if (this.toks[i]?.v !== ')' || name === '') return false
    const next = this.toks[i + 1]
    if (!next) return false
    const last = name.split('.').at(-1)!
    if (!CAST_TYPES.has(last)) return false
    return next.t !== 'op' || next.v === '(' || next.v === '-' || next.v === '!'
  }

  private postfix(): Node {
    let node = this.primary()
    for (;;) {
      if (this.isOp('.') || this.isOp('?.')) {
        this.pos += 1
        const nameTok = this.cur
        if (nameTok?.t !== 'id') throw new Error(`member name expected, got ${nameTok?.v}`)
        const name = nameTok.v
        this.pos += 1
        node = { k: 'member', obj: node, name }
        if (this.isOp('<') && this.genericCallAhead()) {
          const generic = this.skipGeneric()
          this.expect('(')
          node = { k: 'call', callee: node, args: this.args(), generic }
        }
      } else if (this.isOp('(')) {
        this.pos += 1
        node = { k: 'call', callee: node, args: this.args() }
      } else if (this.isOp('[')) {
        this.pos += 1
        const idx = this.expr()
        this.expect(']')
        node = { k: 'index', obj: node, idx }
      } else if (this.isOp('++') || this.isOp('--')) {
        this.pos += 1
      } else break
    }
    return node
  }

  private genericCallAhead(): boolean {
    let depth = 0
    for (let i = this.pos; i < this.toks.length; i += 1) {
      const t = this.toks[i]!
      if (t.v === '<') depth += 1
      else if (t.v === '>') depth -= 1
      else if (t.v === '>>') depth -= 2
      else if (t.t !== 'id' && ![',', '.', '[', ']', '?'].includes(t.v)) return false
      if (depth === 0) return this.toks[i + 1]?.v === '('
    }
    return false
  }

  private args(): Node[] {
    const out: Node[] = []
    while (!this.isOp(')')) {
      // Named, ref and out arguments.
      if (this.cur?.t === 'id' && this.isOp(':', 1) && !this.isOp(':', 2)) this.pos += 2
      if (this.cur?.t === 'id' && (this.cur.v === 'ref' || this.cur.v === 'out')) this.pos += 1
      out.push(this.expr())
      if (!this.eat(',')) break
    }
    this.expect(')')
    return out
  }

  private lambdaBody(params: string[]): Node {
    if (this.isOp('{')) {
      this.skipLambdaBody()
      return { k: 'unknown' }
    }
    return { k: 'lambda', params, body: this.ternary() }
  }

  private skipLambdaBody() {
    if (this.isOp('{')) {
      this.pos = matchTokens(this.toks, this.pos) + 1
      return
    }
    let depth = 0
    while (this.cur) {
      const v = this.cur.v
      if (this.cur.t === 'op') {
        if (v === '(' || v === '[' || v === '{') depth += 1
        else if (v === ')' || v === ']' || v === '}') {
          if (depth === 0) return
          depth -= 1
        } else if ((v === ',' || v === ';') && depth === 0) return
      }
      this.pos += 1
    }
  }

  private primary(): Node {
    const t = this.cur
    if (!t) throw new Error('unexpected end')
    if (t.t === 'num') {
      this.pos += 1
      return { k: 'lit', v: Number(t.v) }
    }
    if (t.t === 'str') {
      this.pos += 1
      return { k: 'lit', v: t.v }
    }
    if (t.t === 'op' && t.v === '(') {
      // Lambda `(a, b) => ...` or parenthesised expression.
      const close = matchTokens(this.toks, this.pos)
      if (this.toks[close + 1]?.v === '=>') {
        const params: string[] = []
        let last = ''
        for (let i = this.pos + 1; i < close; i += 1) {
          const tk = this.toks[i]!
          if (tk.v === ',') {
            params.push(last)
            last = ''
          } else if (tk.t === 'id') last = tk.v
        }
        if (last) params.push(last)
        this.pos = close + 2
        return this.lambdaBody(params)
      }
      this.pos += 1
      const e = this.expr()
      this.expect(')')
      return e
    }
    if (t.t !== 'id') throw new Error(`unexpected ${t.v}`)
    this.pos += 1
    switch (t.v) {
      case 'true':
        return { k: 'lit', v: true }
      case 'false':
        return { k: 'lit', v: false }
      case 'null':
        return { k: 'lit', v: null }
      case 'new':
        return this.newExpr()
      case 'delegate': {
        if (this.isOp('(')) this.pos = matchTokens(this.toks, this.pos) + 1
        this.skipLambdaBody()
        return { k: 'unknown' }
      }
      case 'typeof':
      case 'default':
      case 'nameof': {
        if (this.isOp('(')) this.pos = matchTokens(this.toks, this.pos) + 1
        return { k: 'unknown' }
      }
      case 'global':
        if (this.eat('::')) return this.primary()
        break
    }
    if (this.isOp('=>')) {
      this.pos += 1
      return this.lambdaBody([t.v])
    }
    return { k: 'id', name: t.v }
  }

  private newExpr(): Node {
    let type = ''
    while (this.cur?.t === 'id' || this.isOp('.') || this.isOp('::')) {
      type += this.cur!.v
      this.pos += 1
    }
    type = type.replace(/^global::/, '')
    if (this.isOp('<')) this.skipGeneric()
    let array = false
    if (this.isOp('[')) {
      array = true
      const close = matchTokens(this.toks, this.pos)
      this.pos = close + 1
    }
    let args: Node[] | undefined
    if (this.isOp('(')) {
      this.pos += 1
      args = this.args()
    }
    let init: InitItem[] | undefined
    if (this.isOp('{')) {
      this.pos += 1
      init = []
      while (!this.isOp('}')) {
        const tk = this.cur
        if (tk?.t === 'id' && this.isOp('=', 1)) {
          const name = tk.v
          this.pos += 2
          init.push({ name, value: this.expr() })
        } else if (this.isOp('{')) {
          // Dictionary-style `{ key, value }` pair: keep the pair as an array.
          const close = matchTokens(this.toks, this.pos)
          this.pos = close + 1
          init.push({ value: { k: 'unknown' } })
        } else init.push({ value: this.expr() })
        if (!this.eat(',')) break
      }
      this.expect('}')
    }
    return { k: 'new', type, ...(args ? { args } : {}), ...(init ? { init } : {}), array }
  }
}

function matchTokens(toks: Token[], open: number): number {
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

// ---------------------------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------------------------

type Stmt =
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

function parseStatements(src: string): Stmt[] {
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

// ---------------------------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------------------------

export interface DlcScope {
  required: string[]
  forbidden: string[]
}

export type Native = (
  args: Value[],
  ctx: { interp: Interp; env: Env; recv?: Value; generic?: string },
) => Value

type Flow = { returned: boolean; value?: Value }

const MAX_DEPTH = 60

export class Interp {
  private readonly astCache = new Map<string, Node>()
  private readonly stmtCache = new Map<string, Stmt[]>()
  private readonly fieldCache = new Map<string, Value>()
  private readonly fieldBusy = new Set<string>()
  private depth = 0
  readonly dlcStack: DlcScope[] = []
  /** `Class.Method` (or `Class.Method<T>` ignoring generics) natives, which win over decompiled bodies. */
  readonly natives = new Map<string, Native>()
  /** Hooks for decompiled methods that must be observed instead of run. */
  readonly intercepts = new Map<
    string,
    (bound: Record<string, Value>, method: MethodInfo) => Value
  >()
  /** Classes whose methods are never run; calls return their first object argument or a stub. */
  readonly inertClasses = new Set<string>()
  /** `Class.Method` names of inert classes whose hook may hand control back with a non-value. */
  readonly runBodies = new Set<string>()
  /** Static fields the host supplies instead of the decompiled initialiser. */
  readonly overrides = new Map<string, Value>()
  /** Called when a statement throws; lets callers count what was dropped. */
  onError?: (where: string, error: unknown) => void
  /** Values to hand out for `new X(...)` of engine types, by type name. */
  readonly constructors = new Map<string, (args: Value[], init: Record<string, Value>) => Value>()

  readonly idx: SourceIndex
  constructor(idx: SourceIndex) {
    this.idx = idx
  }

  currentDlc(): DlcScope {
    const scope: DlcScope = { required: [], forbidden: [] }
    for (const s of this.dlcStack) {
      scope.required.push(...s.required)
      scope.forbidden.push(...s.forbidden)
    }
    return scope
  }

  // -- expression entry points ---------------------------------------------------------------

  evalSource(src: string, env: Env): Value {
    let ast = this.astCache.get(src)
    if (!ast) {
      ast = new Parser(tokenize(src)).parseAll()
      this.astCache.set(src, ast)
    }
    return this.evalNode(ast, env)
  }

  private evalNode(n: Node, env: Env): Value {
    switch (n.k) {
      case 'lit':
        return n.v
      case 'unknown':
        return undefined
      case 'lambda':
        return (args: Value[]) => {
          const inner = new Env(env)
          n.params.forEach((p, i) => inner.vars.set(p, args[i]))
          return this.evalNode(n.body, inner)
        }
      case 'id':
        return this.resolveId(n.name, env)
      case 'member':
        return this.member(this.evalNode(n.obj, env), n.name, env)
      case 'index': {
        const obj = this.evalNode(n.obj, env)
        const idx = this.evalNode(n.idx, env)
        if (Array.isArray(obj) && typeof idx === 'number') return obj[idx]
        return undefined
      }
      case 'cast':
        return this.evalNode(n.e, env)
      case 'unary': {
        const v = this.evalNode(n.e, env)
        if (n.op === '!') return typeof v === 'boolean' ? !v : undefined
        if (typeof v !== 'number') return undefined
        return n.op === '-' ? -v : v
      }
      case 'cond': {
        const c = this.evalNode(n.c, env)
        return c === true
          ? this.evalNode(n.a, env)
          : c === false
            ? this.evalNode(n.b, env)
            : undefined
      }
      case 'bin':
        return this.binary(n.op, n.l, n.r, env)
      case 'new':
        return this.construct(n, env)
      case 'call':
        return this.call(n, env)
    }
  }

  private binary(op: string, ln: Node, rn: Node, env: Env): Value {
    const l = this.evalNode(ln, env)
    if (op === '??') return l === null || l === undefined ? this.evalNode(rn, env) : l
    if (op === '&&') {
      if (l === false) return false
      const r = this.evalNode(rn, env)
      return l === true && typeof r === 'boolean' ? r : undefined
    }
    if (op === '||') {
      if (l === true) return true
      const r = this.evalNode(rn, env)
      return l === false && typeof r === 'boolean' ? r : undefined
    }
    const r = this.evalNode(rn, env)
    if (op === '==' || op === '!=') {
      const known = (v: Value) =>
        typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null
      if (!known(l) || !known(r)) return undefined
      return op === '==' ? l === r : l !== r
    }
    if (op === '+' && typeof l === 'string' && (typeof r === 'string' || typeof r === 'number'))
      return l + r
    if (typeof l !== 'number' || typeof r !== 'number') return undefined
    switch (op) {
      case '+':
        return l + r
      case '-':
        return l - r
      case '*':
        return l * r
      case '/':
        return l / r
      case '%':
        return l % r
      case '<':
        return l < r
      case '>':
        return l > r
      case '<=':
        return l <= r
      case '>=':
        return l >= r
    }
    return undefined
  }

  // -- name resolution -----------------------------------------------------------------------

  private resolveId(name: string, env: Env): Value {
    const local = env.lookup(name)
    if (local.found) return local.value
    if (name === 'this') return env.currentSelf
    const cls = env.currentClass
    for (let c: ClassInfo | undefined = cls; c; c = c.parent) {
      const hit = this.staticMember(c, name)
      if (hit.found) return hit.value
    }
    const classes = this.idx.byName.get(name)
    if (classes) return new ClassRef(classes)
    if (this.idx.namespaces.has(name)) return new NsRef(name)
    return new Ref(name)
  }

  /** A field, nested class or enum member of `cls` or its base classes. */
  private staticMember(cls: ClassInfo, name: string): { found: boolean; value?: Value } {
    for (let c: ClassInfo | undefined = cls, hops = 0; c && hops < 8; hops += 1) {
      const override = `${c.name}.${name}`
      if (this.overrides.has(override)) return { found: true, value: this.overrides.get(override) }
      if (c.namespace === 'STRINGS' && c.fields.has(name)) {
        const chain: string[] = []
        for (let o: ClassInfo | undefined = c; o; o = o.parent) chain.unshift(o.name)
        return { found: true, value: new Ref(`STRINGS.${chain.join('.')}.${name}`) }
      }
      if (c.fields.has(name)) return { found: true, value: this.fieldValue(c, name) }
      const nested = c.nested.get(name)
      if (nested) return { found: true, value: new ClassRef([nested]) }
      if (c.enumMembers?.includes(name)) return { found: true, value: name }
      const base: ClassInfo | undefined = c.base ? this.idx.find(c.base)[0] : undefined
      c = base
    }
    return { found: false }
  }

  fieldValue(cls: ClassInfo, name: string): Value {
    const key = `${cls.namespace}.${cls.parent?.name ?? ''}.${cls.name}.${name}`
    if (this.fieldCache.has(key)) return this.fieldCache.get(key)
    if (this.fieldBusy.has(key)) return undefined
    this.fieldBusy.add(key)
    let value: Value
    try {
      value = this.evalSource(cls.fields.get(name)!.expr, new Env(undefined, cls))
    } catch (error) {
      this.onError?.(`field ${cls.name}.${name}`, error)
      value = undefined
    }
    this.fieldBusy.delete(key)
    this.fieldCache.set(key, value)
    return value
  }

  member(obj: Value, name: string, env: Env): Value {
    if (obj instanceof ClassRef) {
      for (const cls of obj.classes) {
        const hit = this.staticMember(cls, name)
        if (hit.found) return hit.value
      }
      // A class that shares its name with a namespace (TUNING): look inside the namespace.
      for (const cls of obj.classes) {
        const inNs = this.idx.find(name, cls.name)
        if (inNs.length > 0) return new ClassRef(inNs)
      }
      return new Ref(`${obj.classes[0]!.name}.${name}`)
    }
    if (obj instanceof NsRef) {
      const classes = this.idx.find(name, obj.name)
      return classes.length > 0 ? new ClassRef(classes) : new Ref(`${obj.name}.${name}`)
    }
    if (obj instanceof Ref) return new Ref(`${obj.path}.${name}`)
    if (Array.isArray(obj)) return name === 'Count' || name === 'Length' ? obj.length : undefined
    if (typeof obj === 'string') return name === 'Length' ? obj.length : undefined
    if (obj && typeof obj === 'object') {
      const o = obj as Obj
      if (name in o) return o[name] as Value
      if (o.$class) {
        const hit = this.staticMember(o.$class, name)
        if (hit.found) return hit.value
      }
      return undefined
    }
    return undefined
  }

  // -- construction ------------------------------------------------------------------------

  private construct(n: Extract<Node, { k: 'new' }>, env: Env): Value {
    const args = (n.args ?? []).map((a) => this.evalNode(a, env))
    const typeName = n.type.split('.').at(-1)!
    if (n.array || ['List', 'HashSet', 'Dictionary'].includes(typeName) || n.type === '') {
      if (n.init) return n.init.map((it) => this.evalNode(it.value, env))
      if (args.length === 1 && Array.isArray(args[0])) return [...args[0]]
      return []
    }
    const initValues: Record<string, Value> = {}
    for (const it of n.init ?? []) {
      if ('name' in it) initValues[it.name] = this.evalNode(it.value, env)
    }
    const custom = this.constructors.get(n.type) ?? this.constructors.get(typeName)
    if (custom) return custom(args, initValues)
    if (typeName === 'Tag') return typeof args[0] === 'string' ? args[0] : ''
    // User classes: run the constructor whose arity fits.
    const classes = this.idx.byName.get(typeName) ?? []
    const cls = classes.find((c) => this.resolveCtor(c, args.length)) ?? classes[0]
    const obj: Obj = { $type: n.type, ...(cls ? { $class: cls } : {}), ...initValues }
    const ctor = cls ? this.resolveCtor(cls, args.length, args) : undefined
    if (cls && ctor) {
      const local = new Env(undefined, cls, obj)
      this.bind(ctor, args, local)
      this.run(ctor.body, local)
    }
    return obj
  }

  private resolveCtor(cls: ClassInfo, argc: number, args?: Value[]): MethodInfo | undefined {
    const list = cls.methods.get(cls.name) ?? []
    return this.pickOverload(list, argc, args)
  }

  // -- calls ---------------------------------------------------------------------------------

  private call(n: Extract<Node, { k: 'call' }>, env: Env): Value {
    const args = n.args.map((a) => this.evalNode(a, env))
    const callee = n.callee
    if (callee.k === 'id') {
      for (let c: ClassInfo | undefined = env.currentClass; c; c = c.parent) {
        const m = this.findMethod(c, callee.name, args)
        if (m) return this.invoke(m, args, m.isStatic ? undefined : env.currentSelf)
      }
      return undefined
    }
    if (callee.k !== 'member') return undefined
    const recv = this.evalNode(callee.obj, env)
    return this.callMethod(recv, callee.name, args, env, n.generic)
  }

  callMethod(recv: Value, name: string, args: Value[], env: Env, generic?: string): Value {
    if (recv instanceof ClassRef) {
      for (const cls of recv.classes) {
        const key = `${cls.name}.${name}`
        const native = this.natives.get(key)
        if (native)
          return native(args, { interp: this, env, recv, ...(generic ? { generic } : {}) })
      }
      for (const cls of recv.classes) {
        const m = this.findMethod(cls, name, args)
        if (m) return this.invoke(m, args)
      }
      return new Ref(`${recv.classes[0]!.name}.${name}()`)
    }
    if (recv instanceof Ref) {
      const native = this.natives.get(`Ref:${recv.path}.${name}`)
      if (native) return native(args, { interp: this, env, recv })
      return new Ref(`${recv.path}.${name}()`)
    }
    if (typeof recv === 'string') return this.stringMethod(recv, name, args)
    if (Array.isArray(recv)) return this.listMethod(recv, name, args)
    if (recv && typeof recv === 'object' && !(recv instanceof NsRef)) {
      const o = recv as Obj
      const native = this.natives.get(`${o.$type}.${name}`)
      if (native) return native(args, { interp: this, env, recv, ...(generic ? { generic } : {}) })
      if (o.$class) {
        const m = this.findMethod(o.$class, name, args)
        if (m) {
          const result = this.invoke(m, args, o)
          return result === undefined && /^Add/.test(name) ? o : result
        }
      }
      // Unknown engine objects stay inert: calls on them return the receiver so chains keep going.
      return o
    }
    return undefined
  }

  private stringMethod(s: string, name: string, args: Value[]): Value {
    switch (name) {
      case 'ToTag':
      case 'CreateTag':
      case 'ToString':
      case 'Trim':
        return s
      case 'ToUpper':
        return s.toUpperCase()
      case 'ToLower':
        return s.toLowerCase()
      case 'Contains':
        return typeof args[0] === 'string' ? s.includes(args[0]) : undefined
      case 'StartsWith':
        return typeof args[0] === 'string' ? s.startsWith(args[0]) : undefined
      case 'Equals':
        return typeof args[0] === 'string' ? s === args[0] : undefined
    }
    return undefined
  }

  private listMethod(list: Value[], name: string, args: Value[]): Value {
    switch (name) {
      case 'Add':
        list.push(args[0])
        return undefined
      case 'AddRange':
        if (Array.isArray(args[0])) list.push(...args[0])
        return undefined
      case 'ToArray':
      case 'ToList':
        return [...list]
      case 'Contains':
        return list.includes(args[0])
      case 'Concat':
        return Array.isArray(args[0]) ? [...list, ...args[0]] : [...list]
      case 'Find':
      case 'FirstOrDefault':
        return typeof args[0] === 'function'
          ? (list.find((x) => args[0] instanceof Function && args[0]([x]) === true) ?? null)
          : undefined
      case 'FindAll':
      case 'Where':
        return typeof args[0] === 'function'
          ? list.filter((x) => args[0] instanceof Function && args[0]([x]) === true)
          : undefined
      case 'Any':
        return typeof args[0] === 'function'
          ? list.some((x) => args[0] instanceof Function && args[0]([x]) === true)
          : list.length > 0
    }
    return undefined
  }

  private findMethod(cls: ClassInfo, name: string, args: Value[]): MethodInfo | undefined {
    for (let c: ClassInfo | undefined = cls, hops = 0; c && hops < 8; hops += 1) {
      const list = c.methods.get(name)
      if (list) {
        const m = this.pickOverload(list, args.length, args)
        if (m) return m
      }
      c = c.base ? this.idx.find(c.base)[0] : undefined
    }
    return undefined
  }

  private pickOverload(list: MethodInfo[], argc: number, args?: Value[]): MethodInfo | undefined {
    const fits = list.filter((m) => {
      const required = m.params.filter((p) => p.def === undefined).length
      return argc >= required && argc <= m.params.length
    })
    if (fits.length <= 1 || !args) return fits[0]
    const compatible = fits.filter((m) =>
      m.params.every((p, i) => i >= args.length || accepts(p.type, args[i])),
    )
    const pool = compatible.length > 0 ? compatible : fits
    return pool.find((m) => m.params.length === argc) ?? pool[0]
  }

  private bind(m: MethodInfo, args: Value[], env: Env): Record<string, Value> {
    const bound: Record<string, Value> = {}
    m.params.forEach((p, i) => {
      let v: Value
      if (i < args.length) v = args[i]
      else if (p.def !== undefined) {
        try {
          v = this.evalSource(p.def, new Env(undefined, m.owner))
        } catch {
          v = undefined
        }
      }
      env.vars.set(p.name, v)
      bound[p.name] = v
    })
    return bound
  }

  invoke(m: MethodInfo, args: Value[], self?: Obj): Value {
    if (this.depth > MAX_DEPTH) return undefined
    const env = new Env(undefined, m.owner, self)
    const bound = this.bind(m, args, env)
    const key = `${m.owner.name}.${m.name}`
    const hook = this.intercepts.get(key)
    if (hook) {
      const result = hook(bound, m)
      if (typeof result !== 'symbol') return result
    } else if (this.inertClasses.has(m.owner.name) && !this.runBodies.has(key)) {
      const first = args[0]
      return first && typeof first === 'object' && !Array.isArray(first) && '$type' in first
        ? first
        : { $type: 'GameObject', id: typeof first === 'string' ? first : undefined, tags: [] }
    }
    this.depth += 1
    try {
      return this.run(m.body, env).value
    } finally {
      this.depth -= 1
    }
  }

  // -- statements ----------------------------------------------------------------------------

  run(body: string, env: Env): Flow {
    let stmts = this.stmtCache.get(body)
    if (!stmts) {
      stmts = parseStatements(body)
      this.stmtCache.set(body, stmts)
    }
    return this.execList(stmts, env)
  }

  private execList(stmts: Stmt[], env: Env): Flow {
    for (const s of stmts) {
      const flow = this.exec(s, env)
      if (flow.returned) return flow
    }
    return { returned: false }
  }

  private safe<T>(where: string, fn: () => T): T | undefined {
    try {
      return fn()
    } catch (error) {
      this.onError?.(where, error)
      return undefined
    }
  }

  private exec(s: Stmt, env: Env): Flow {
    switch (s.k) {
      case 'skip':
        return { returned: false }
      case 'block':
        return this.execList(s.body, new Env(env))
      case 'return': {
        const value = s.text
          ? this.safe(`return ${s.text.slice(0, 80)}`, () => this.evalSource(s.text!, env))
          : undefined
        return { returned: true, value }
      }
      case 'expr':
        this.safe(s.text.slice(0, 100), () => this.execExpr(s.text, env))
        return { returned: false }
      case 'foreach': {
        const source = this.safe(`foreach ${s.source.slice(0, 60)}`, () =>
          this.evalSource(s.source, env),
        )
        if (!Array.isArray(source)) return { returned: false }
        for (const item of source) {
          const inner = new Env(env)
          inner.vars.set(s.varName, item)
          const flow = this.execList(s.body, inner)
          if (flow.returned) return flow
        }
        return { returned: false }
      }
      case 'if':
        return this.execIf(s, env)
    }
  }

  private execIf(s: Extract<Stmt, { k: 'if' }>, env: Env): Flow {
    if (/\bDlcManager\b/.test(s.cond)) {
      const scope = dlcCondition(s.cond, (expr) =>
        this.safe('dlc', () => this.evalSource(expr, env)),
      )
      if (scope) {
        const negated = scope.negated
        this.dlcStack.push(
          negated ? { required: [], forbidden: scope.ids } : { required: scope.ids, forbidden: [] },
        )
        const a = this.execList(s.then, new Env(env))
        this.dlcStack.pop()
        if (a.returned) return a
        if (s.else) {
          this.dlcStack.push(
            negated
              ? { required: scope.ids, forbidden: [] }
              : { required: [], forbidden: scope.ids },
          )
          const b = this.execList(s.else, new Env(env))
          this.dlcStack.pop()
          return b
        }
        return { returned: false }
      }
    }
    const cond = this.safe(`if ${s.cond.slice(0, 80)}`, () => this.evalSource(s.cond, env))
    if (cond === true) return this.execList(s.then, new Env(env))
    if (cond === false && s.else) return this.execList(s.else, new Env(env))
    return { returned: false }
  }

  private static readonly DECL =
    /^(?:const\s+|readonly\s+)?([A-Za-z_][\w.]*(?:<[^=;()]*?>)?(?:\[\])*\??)\s+([A-Za-z_]\w*)\s*(?:=(?!=)\s*([\s\S]*))?$/

  private execExpr(text: string, env: Env): void {
    if (/\bdelegate\b|\+=\s*[\w.]*\s*(\(|=>)/.test(text) || /\w\s*\+=\s*\(?\w*\)?\s*=>/.test(text))
      return
    const decl = Interp.DECL.exec(text)
    if (decl && !/^(return|new|else|throw|yield)$/.test(decl[1]!)) {
      env.vars.set(decl[2]!, decl[3] !== undefined ? this.evalSource(decl[3], env) : undefined)
      return
    }
    const eq = findAssign(text)
    if (eq) {
      const { target, op, rhsText } = eq
      if (op === '-=' || target.includes('[')) return
      if (op === '+=' && !/^\w+$/.test(target)) return
      const rhs = this.evalSource(rhsText, env)
      const dot = target.lastIndexOf('.')
      if (dot < 0) {
        if (op === '=' || op === '??=') {
          if (!env.assign(target, rhs)) env.vars.set(target, rhs)
        } else {
          const cur = env.lookup(target).value
          if (typeof cur === 'number' && typeof rhs === 'number')
            env.assign(target, op === '+=' ? cur + rhs : op === '*=' ? cur * rhs : cur / rhs)
        }
        return
      }
      const owner = this.evalSource(target.slice(0, dot), env)
      if (owner && typeof owner === 'object' && '$type' in owner)
        (owner as Obj)[target.slice(dot + 1)] = rhs
      return
    }
    this.evalSource(text, env)
  }
}

/** Splits `lhs op rhs` at the first top-level assignment operator. */
function findAssign(text: string): { target: string; op: string; rhsText: string } | undefined {
  let depth = 0
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!
    if (c === '"' || c === "'") return undefined
    if (c === '(' || c === '[' || c === '{' || c === '<') depth += c === '<' ? 0 : 1
    else if (c === ')' || c === ']' || c === '}') depth -= 1
    else if (
      depth === 0 &&
      c === '=' &&
      text[i + 1] !== '=' &&
      text[i + 1] !== '>' &&
      !/[=!<>]/.test(text[i - 1] ?? ' ')
    ) {
      let start = i
      if (/[+\-*/?]/.test(text[i - 1] ?? '')) start = text[i - 2] === '?' ? i - 2 : i - 1
      const op = text.slice(start, i + 1)
      return { target: text.slice(0, start).trim(), op, rhsText: text.slice(i + 1).trim() }
    }
  }
  return undefined
}

function accepts(type: string, v: Value): boolean {
  const t = type.replace(/\?$/, '')
  if (/^(float|int|double|long|byte|short|uint)$/.test(t))
    return typeof v === 'number' || v === undefined
  if (t === 'bool') return typeof v === 'boolean' || v === undefined
  if (t === 'string' || t === 'Tag')
    return typeof v === 'string' || v instanceof Ref || v === undefined || v === null
  if (/\[\]$|^(List|HashSet|IEnumerable)</.test(t))
    return Array.isArray(v) || v === undefined || v === null
  return typeof v !== 'number' && typeof v !== 'boolean' && typeof v !== 'string'
}

/** Which DLC ids a condition about DlcManager asks for, and whether the whole test is negated. */
function dlcCondition(
  cond: string,
  evalExpr: (expr: string) => Value,
): { ids: string[]; negated: boolean } | undefined {
  const ids: string[] = []
  const negated = /^\s*!/.test(cond)
  if (/IsExpansion1Active/.test(cond)) ids.push('EXPANSION1_ID')
  for (const m of cond.matchAll(/(?:IsContentSubscribed|IsContentActive|Contains)\(([^)]*)\)/g)) {
    const v = evalExpr(m[1]!)
    if (typeof v === 'string') ids.push(v)
    else if (Array.isArray(v)) ids.push(...v.filter((x): x is string => typeof x === 'string'))
  }
  return ids.length > 0 ? { ids, negated } : undefined
}

export { splitTop }
