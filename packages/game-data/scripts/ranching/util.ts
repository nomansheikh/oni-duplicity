import type { Obj, Value } from '../csharp/interp.ts'
import { Ref } from '../csharp/interp.ts'
import type { ClassInfo } from '../csharp/source.ts'
import type { Ctx } from './types.ts'

export const RUN = Symbol('run')

export const stub = (type: string, extra: Record<string, unknown> = {}): Obj => ({
  $type: type,
  ...extra,
})
export const num = (v: Value, fallback = 0) => (typeof v === 'number' ? v : fallback)
export const str = (v: Value) => (typeof v === 'string' ? v : v instanceof Ref ? v.path : '')

export function runCreatePrefab(ctx: Ctx, cls: ClassInfo): Value {
  const m = cls.methods.get('CreatePrefab')?.[0]
  if (!m) return undefined
  const self: Obj = { $type: cls.name, $class: cls }
  return ctx.interp.invoke(m, [], self)
}

export function splitArgs(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!
    if (c === '(' || c === '[' || c === '{') depth += 1
    else if (c === ')' || c === ']' || c === '}') depth -= 1
    else if (c === ',' && depth === 0) {
      out.push(text.slice(start, i).trim())
      start = i + 1
    }
  }
  out.push(text.slice(start).trim())
  return out
}
