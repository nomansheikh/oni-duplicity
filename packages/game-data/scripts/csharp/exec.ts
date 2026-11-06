import { dlcCondition, findAssign } from './helpers.ts'
import type { Interp } from './interp.ts'
import type { Stmt } from './statements.ts'
import type { Flow, Obj } from './values.ts'
import { Env } from './values.ts'

const DECL =
  /^(?:const\s+|readonly\s+)?([A-Za-z_][\w.]*(?:<[^=;()]*?>)?(?:\[\])*\??)\s+([A-Za-z_]\w*)\s*(?:=(?!=)\s*([\s\S]*))?$/

export function execList(interp: Interp, stmts: Stmt[], env: Env): Flow {
  for (const s of stmts) {
    const flow = exec(interp, s, env)
    if (flow.returned) return flow
  }
  return { returned: false }
}

function safe<T>(interp: Interp, where: string, fn: () => T): T | undefined {
  try {
    return fn()
  } catch (error) {
    interp.onError?.(where, error)
    return undefined
  }
}

function exec(interp: Interp, s: Stmt, env: Env): Flow {
  switch (s.k) {
    case 'skip':
      return { returned: false }
    case 'block':
      return execList(interp, s.body, new Env(env))
    case 'return': {
      const value = s.text
        ? safe(interp, `return ${s.text.slice(0, 80)}`, () => interp.evalSource(s.text!, env))
        : undefined
      return { returned: true, value }
    }
    case 'expr':
      safe(interp, s.text.slice(0, 100), () => execExpr(interp, s.text, env))
      return { returned: false }
    case 'foreach': {
      const source = safe(interp, `foreach ${s.source.slice(0, 60)}`, () =>
        interp.evalSource(s.source, env),
      )
      if (!Array.isArray(source)) return { returned: false }
      for (const item of source) {
        const inner = new Env(env)
        inner.vars.set(s.varName, item)
        const flow = execList(interp, s.body, inner)
        if (flow.returned) return flow
      }
      return { returned: false }
    }
    case 'if':
      return execIf(interp, s, env)
  }
}

function execIf(interp: Interp, s: Extract<Stmt, { k: 'if' }>, env: Env): Flow {
  if (/\bDlcManager\b/.test(s.cond)) {
    const scope = dlcCondition(s.cond, (expr) =>
      safe(interp, 'dlc', () => interp.evalSource(expr, env)),
    )
    if (scope) {
      const { negated, ids } = scope
      interp.dlcStack.push(
        negated ? { required: [], forbidden: ids } : { required: ids, forbidden: [] },
      )
      const a = execList(interp, s.then, new Env(env))
      interp.dlcStack.pop()
      if (a.returned) return a
      if (s.else) {
        interp.dlcStack.push(
          negated ? { required: ids, forbidden: [] } : { required: [], forbidden: ids },
        )
        const b = execList(interp, s.else, new Env(env))
        interp.dlcStack.pop()
        return b
      }
      return { returned: false }
    }
  }
  const cond = safe(interp, `if ${s.cond.slice(0, 80)}`, () => interp.evalSource(s.cond, env))
  if (cond === true) return execList(interp, s.then, new Env(env))
  if (cond === false && s.else) return execList(interp, s.else, new Env(env))
  return { returned: false }
}

function execExpr(interp: Interp, text: string, env: Env): void {
  if (/\bdelegate\b|\+=\s*[\w.]*\s*(\(|=>)/.test(text) || /\w\s*\+=\s*\(?\w*\)?\s*=>/.test(text))
    return
  const decl = DECL.exec(text)
  if (decl && !/^(return|new|else|throw|yield)$/.test(decl[1]!)) {
    env.vars.set(decl[2]!, decl[3] !== undefined ? interp.evalSource(decl[3], env) : undefined)
    return
  }
  const eq = findAssign(text)
  if (eq) {
    const { target, op, rhsText } = eq
    if (op === '-=' || target.includes('[')) return
    if (op === '+=' && !/^\w+$/.test(target)) return
    const rhs = interp.evalSource(rhsText, env)
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
    const owner = interp.evalSource(target.slice(0, dot), env)
    if (owner && typeof owner === 'object' && '$type' in owner)
      (owner as Obj)[target.slice(dot + 1)] = rhs
    return
  }
  interp.evalSource(text, env)
}
