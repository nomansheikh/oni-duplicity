import type { InitItem, Node } from './ast.ts'
import { matchTokens } from './tokenizer.ts'
import { ParserBase } from './parser-base.ts'

/** Postfix chains, primaries, lambdas and `new` expressions. */
export abstract class PrimaryParser extends ParserBase {
  abstract expr(): Node
  protected abstract ternary(): Node

  protected postfix(): Node {
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

  protected args(): Node[] {
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

  protected lambdaBody(params: string[]): Node {
    if (this.isOp('{')) {
      this.skipLambdaBody()
      return { k: 'unknown' }
    }
    return { k: 'lambda', params, body: this.ternary() }
  }

  protected primary(): Node {
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

  protected newExpr(): Node {
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
