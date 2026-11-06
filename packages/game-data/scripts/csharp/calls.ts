import type { Node } from './ast.ts'
import { accepts } from './helpers.ts'
import type { Interp } from './interp.ts'
import { listMethod, stringMethod } from './natives.ts'
import type { ClassInfo, MethodInfo } from './source.ts'
import { ClassRef, Env, NsRef, Ref, type Obj, type Value } from './values.ts'

const MAX_DEPTH = 60

export function construct(interp: Interp, n: Extract<Node, { k: 'new' }>, env: Env): Value {
  const args = (n.args ?? []).map((a) => interp.evalNode(a, env))
  const typeName = n.type.split('.').at(-1)!
  if (n.array || ['List', 'HashSet', 'Dictionary'].includes(typeName) || n.type === '') {
    if (n.init) return n.init.map((it) => interp.evalNode(it.value, env))
    if (args.length === 1 && Array.isArray(args[0])) return [...args[0]]
    return []
  }
  const initValues: Record<string, Value> = {}
  for (const it of n.init ?? []) {
    if ('name' in it) initValues[it.name] = interp.evalNode(it.value, env)
  }
  const custom = interp.constructors.get(n.type) ?? interp.constructors.get(typeName)
  if (custom) return custom(args, initValues)
  if (typeName === 'Tag') return typeof args[0] === 'string' ? args[0] : ''
  // User classes: run the constructor whose arity fits.
  const classes = interp.idx.byName.get(typeName) ?? []
  const cls = classes.find((c) => resolveCtor(c, args.length)) ?? classes[0]
  const obj: Obj = { $type: n.type, ...(cls ? { $class: cls } : {}), ...initValues }
  const ctor = cls ? resolveCtor(cls, args.length, args) : undefined
  if (cls && ctor) {
    const local = new Env(undefined, cls, obj)
    bind(interp, ctor, args, local)
    interp.run(ctor.body, local)
  }
  return obj
}

function resolveCtor(cls: ClassInfo, argc: number, args?: Value[]): MethodInfo | undefined {
  return pickOverload(cls.methods.get(cls.name) ?? [], argc, args)
}

export function call(interp: Interp, n: Extract<Node, { k: 'call' }>, env: Env): Value {
  const args = n.args.map((a) => interp.evalNode(a, env))
  const callee = n.callee
  if (callee.k === 'id') {
    for (let c: ClassInfo | undefined = env.currentClass; c; c = c.parent) {
      const m = findMethod(interp, c, callee.name, args)
      if (m) return invoke(interp, m, args, m.isStatic ? undefined : env.currentSelf)
    }
    return undefined
  }
  if (callee.k !== 'member') return undefined
  const recv = interp.evalNode(callee.obj, env)
  return callMethod(interp, recv, callee.name, args, env, n.generic)
}

export function callMethod(
  interp: Interp,
  recv: Value,
  name: string,
  args: Value[],
  env: Env,
  generic?: string,
): Value {
  const ctx = { interp, env, recv, ...(generic ? { generic } : {}) }
  if (recv instanceof ClassRef) {
    for (const cls of recv.classes) {
      const native = interp.natives.get(`${cls.name}.${name}`)
      if (native) return native(args, ctx)
    }
    for (const cls of recv.classes) {
      const m = findMethod(interp, cls, name, args)
      if (m) return invoke(interp, m, args)
    }
    return new Ref(`${recv.classes[0]!.name}.${name}()`)
  }
  if (recv instanceof Ref) {
    const native = interp.natives.get(`Ref:${recv.path}.${name}`)
    if (native) return native(args, { interp, env, recv })
    return new Ref(`${recv.path}.${name}()`)
  }
  if (typeof recv === 'string') return stringMethod(recv, name, args)
  if (Array.isArray(recv)) return listMethod(recv, name, args)
  if (recv && typeof recv === 'object' && !(recv instanceof NsRef)) {
    const o = recv as Obj
    const native = interp.natives.get(`${o.$type}.${name}`)
    if (native) return native(args, ctx)
    if (o.$class) {
      const m = findMethod(interp, o.$class, name, args)
      if (m) {
        const result = invoke(interp, m, args, o)
        return result === undefined && /^Add/.test(name) ? o : result
      }
    }
    // Unknown engine objects stay inert: calls on them return the receiver so chains keep going.
    return o
  }
  return undefined
}

function findMethod(
  interp: Interp,
  cls: ClassInfo,
  name: string,
  args: Value[],
): MethodInfo | undefined {
  for (let c: ClassInfo | undefined = cls, hops = 0; c && hops < 8; hops += 1) {
    const list = c.methods.get(name)
    if (list) {
      const m = pickOverload(list, args.length, args)
      if (m) return m
    }
    c = c.base ? interp.idx.find(c.base)[0] : undefined
  }
  return undefined
}

function pickOverload(list: MethodInfo[], argc: number, args?: Value[]): MethodInfo | undefined {
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

function bind(interp: Interp, m: MethodInfo, args: Value[], env: Env): Record<string, Value> {
  const bound: Record<string, Value> = {}
  m.params.forEach((p, i) => {
    let v: Value
    if (i < args.length) v = args[i]
    else if (p.def !== undefined) {
      try {
        v = interp.evalSource(p.def, new Env(undefined, m.owner))
      } catch {
        v = undefined
      }
    }
    env.vars.set(p.name, v)
    bound[p.name] = v
  })
  return bound
}

export function invoke(interp: Interp, m: MethodInfo, args: Value[], self?: Obj): Value {
  if (interp.depth > MAX_DEPTH) return undefined
  const env = new Env(undefined, m.owner, self)
  const bound = bind(interp, m, args, env)
  const key = `${m.owner.name}.${m.name}`
  const hook = interp.intercepts.get(key)
  if (hook) {
    const result = hook(bound, m)
    if (typeof result !== 'symbol') return result
  } else if (interp.inertClasses.has(m.owner.name) && !interp.runBodies.has(key)) {
    const first = args[0]
    return first && typeof first === 'object' && !Array.isArray(first) && '$type' in first
      ? first
      : { $type: 'GameObject', id: typeof first === 'string' ? first : undefined, tags: [] }
  }
  interp.depth += 1
  try {
    return interp.run(m.body, env).value
  } finally {
    interp.depth -= 1
  }
}
