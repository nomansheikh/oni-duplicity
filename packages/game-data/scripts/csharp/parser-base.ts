import { matchTokens, type Token } from './tokenizer.ts'

/** Token cursor and the type/generic skipping helpers shared by the parser layers. */
export abstract class ParserBase {
  protected pos = 0
  protected readonly toks: Token[]
  constructor(toks: Token[]) {
    this.toks = toks
  }

  protected get cur(): Token | undefined {
    return this.toks[this.pos]
  }
  protected isOp(v: string, off = 0) {
    const t = this.toks[this.pos + off]
    return t?.t === 'op' && t.v === v
  }
  protected eat(v: string) {
    if (this.isOp(v)) {
      this.pos += 1
      return true
    }
    return false
  }
  protected expect(v: string) {
    if (!this.eat(v)) throw new Error(`expected ${v} at ${this.pos}: ${this.cur?.v}`)
  }
  get done() {
    return this.pos >= this.toks.length
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

  protected genericCallAhead(): boolean {
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

  protected skipLambdaBody() {
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
}
