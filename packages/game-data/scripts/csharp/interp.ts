/**
 * A tiny interpreter for the subset of C# that the game's entity configs are written in:
 * static fields, arithmetic, collection initialisers, `new` of plain data classes, and
 * straight-line methods with `if` and `foreach`. Calls into the engine (EntityTemplates,
 * Db, Assets, ...) are not run; the host registers natives for the few it needs to observe.
 * Anything it cannot evaluate becomes `undefined`/`Ref` and is dropped by the caller.
 */
import { splitTop, type MethodInfo, type SourceIndex } from './source.ts'
import type { ClassInfo } from './source.ts'
import type { Node } from './ast.ts'
import { call, callMethod, construct, invoke } from './calls.ts'
import { execList } from './exec.ts'
import { applyBinary } from './helpers.ts'
import { Parser } from './parser.ts'
import { fieldValue, member, resolveId } from './resolve.ts'
import { parseStatements, type Stmt } from './statements.ts'
import { tokenize } from './tokenizer.ts'
import { Env, type DlcScope, type Flow, type Native, type Obj, type Value } from './values.ts'

export { Env, Ref, ClassRef } from './values.ts'
export type { DlcScope, Native, Obj, Value } from './values.ts'
export { splitTop }

export class Interp {
  readonly astCache = new Map<string, Node>()
  readonly stmtCache = new Map<string, Stmt[]>()
  readonly fieldCache = new Map<string, Value>()
  readonly fieldBusy = new Set<string>()
  depth = 0
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

  evalSource(src: string, env: Env): Value {
    let ast = this.astCache.get(src)
    if (!ast) {
      ast = new Parser(tokenize(src)).parseAll()
      this.astCache.set(src, ast)
    }
    return this.evalNode(ast, env)
  }

  evalNode(n: Node, env: Env): Value {
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
        return resolveId(this, n.name, env)
      case 'member':
        return member(this, this.evalNode(n.obj, env), n.name)
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
        return construct(this, n, env)
      case 'call':
        return call(this, n, env)
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
    return applyBinary(op, l, this.evalNode(rn, env))
  }

  fieldValue(cls: ClassInfo, name: string): Value {
    return fieldValue(this, cls, name)
  }

  member(obj: Value, name: string, _env?: Env): Value {
    return member(this, obj, name)
  }

  callMethod(recv: Value, name: string, args: Value[], env: Env, generic?: string): Value {
    return callMethod(this, recv, name, args, env, generic)
  }

  invoke(m: MethodInfo, args: Value[], self?: Obj): Value {
    return invoke(this, m, args, self)
  }

  run(body: string, env: Env): Flow {
    let stmts = this.stmtCache.get(body)
    if (!stmts) {
      stmts = parseStatements(body)
      this.stmtCache.set(body, stmts)
    }
    return execList(this, stmts, env)
  }
}
