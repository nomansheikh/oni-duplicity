import type { Node } from './ast.ts'
import { CAST_TYPES } from './ast.ts'
import { PrimaryParser } from './parser-primary.ts'

export class Parser extends PrimaryParser {
  parseAll(): Node {
    const n = this.expr()
    if (!this.done) throw new Error(`trailing tokens: ${this.cur?.v}`)
    return n
  }

  override expr(): Node {
    return this.ternary()
  }

  protected ternary(): Node {
    const c = this.binary(0)
    if (this.eat('?')) {
      const a = this.ternary()
      this.expect(':')
      const b = this.ternary()
      return { k: 'cond', c, a, b }
    }
    return c
  }

  protected static readonly LEVELS: string[][] = [
    ['??'],
    ['||'],
    ['&&'],
    ['==', '!='],
    ['<', '>', '<=', '>=', 'is', 'as'],
    ['+', '-'],
    ['*', '/', '%'],
  ]

  protected binary(level: number): Node {
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

  protected skipType() {
    while (this.cur?.t === 'id' || this.isOp('.') || this.isOp('?')) this.pos += 1
    if (this.isOp('<')) this.skipGeneric()
    while (this.isOp('[') && this.isOp(']', 1)) this.pos += 2
  }

  protected skipGeneric(): string {
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

  protected unary(): Node {
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

  protected looksLikeCast(): boolean {
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
}
