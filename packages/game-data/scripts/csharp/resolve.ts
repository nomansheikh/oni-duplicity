import type { ClassInfo } from './source.ts'
import type { Interp } from './interp.ts'
import { ClassRef, Env, NsRef, Ref, type Obj, type Value } from './values.ts'

type Hit = { found: boolean; value?: Value }

export function resolveId(interp: Interp, name: string, env: Env): Value {
  const local = env.lookup(name)
  if (local.found) return local.value
  if (name === 'this') return env.currentSelf
  for (let c: ClassInfo | undefined = env.currentClass; c; c = c.parent) {
    const hit = staticMember(interp, c, name)
    if (hit.found) return hit.value
  }
  const classes = interp.idx.byName.get(name)
  if (classes) return new ClassRef(classes)
  if (interp.idx.namespaces.has(name)) return new NsRef(name)
  return new Ref(name)
}

/** A field, nested class or enum member of `cls` or its base classes. */
function staticMember(interp: Interp, cls: ClassInfo, name: string): Hit {
  for (let c: ClassInfo | undefined = cls, hops = 0; c && hops < 8; hops += 1) {
    const override = `${c.name}.${name}`
    if (interp.overrides.has(override))
      return { found: true, value: interp.overrides.get(override) }
    if (c.namespace === 'STRINGS' && c.fields.has(name)) {
      const chain: string[] = []
      for (let o: ClassInfo | undefined = c; o; o = o.parent) chain.unshift(o.name)
      return { found: true, value: new Ref(`STRINGS.${chain.join('.')}.${name}`) }
    }
    if (c.fields.has(name)) return { found: true, value: interp.fieldValue(c, name) }
    const nested = c.nested.get(name)
    if (nested) return { found: true, value: new ClassRef([nested]) }
    if (c.enumMembers?.includes(name)) return { found: true, value: name }
    const base: ClassInfo | undefined = c.base ? interp.idx.find(c.base)[0] : undefined
    c = base
  }
  return { found: false }
}

export function fieldValue(interp: Interp, cls: ClassInfo, name: string): Value {
  const key = `${cls.namespace}.${cls.parent?.name ?? ''}.${cls.name}.${name}`
  if (interp.fieldCache.has(key)) return interp.fieldCache.get(key)
  if (interp.fieldBusy.has(key)) return undefined
  interp.fieldBusy.add(key)
  let value: Value
  try {
    value = interp.evalSource(cls.fields.get(name)!.expr, new Env(undefined, cls))
  } catch (error) {
    interp.onError?.(`field ${cls.name}.${name}`, error)
    value = undefined
  }
  interp.fieldBusy.delete(key)
  interp.fieldCache.set(key, value)
  return value
}

export function member(interp: Interp, obj: Value, name: string): Value {
  if (obj instanceof ClassRef) {
    for (const cls of obj.classes) {
      const hit = staticMember(interp, cls, name)
      if (hit.found) return hit.value
    }
    // A class that shares its name with a namespace (TUNING): look inside the namespace.
    for (const cls of obj.classes) {
      const inNs = interp.idx.find(name, cls.name)
      if (inNs.length > 0) return new ClassRef(inNs)
    }
    return new Ref(`${obj.classes[0]!.name}.${name}`)
  }
  if (obj instanceof NsRef) {
    const classes = interp.idx.find(name, obj.name)
    return classes.length > 0 ? new ClassRef(classes) : new Ref(`${obj.name}.${name}`)
  }
  if (obj instanceof Ref) return new Ref(`${obj.path}.${name}`)
  if (Array.isArray(obj)) return name === 'Count' || name === 'Length' ? obj.length : undefined
  if (typeof obj === 'string') return name === 'Length' ? obj.length : undefined
  if (obj && typeof obj === 'object') {
    const o = obj as Obj
    if (name in o) return o[name] as Value
    if (o.$class) {
      const hit = staticMember(interp, o.$class, name)
      if (hit.found) return hit.value
    }
    return undefined
  }
  return undefined
}
