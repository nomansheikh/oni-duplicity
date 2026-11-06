import type { ClassInfo } from '../csharp/source.ts'
import { newCapture, type Ctx } from './types.ts'
import { runCreatePrefab } from './util.ts'

/** Builds the lookup from an entity id to the string key of its display name, lazily. */
export function createNameRefOf(ctx: Ctx): (id: string) => string | undefined {
  const { idx, interp } = ctx
  let idClasses: Map<string, ClassInfo> | undefined
  const nameRefOf = (id: string): string | undefined => {
    if (!idClasses) {
      idClasses = new Map()
      for (const list of idx.byName.values()) {
        for (const cls of list) {
          if (
            !/Config$/.test(cls.name) ||
            !cls.fields.has('ID') ||
            !cls.methods.has('CreatePrefab')
          )
            continue
          const v = interp.fieldValue(cls, 'ID')
          if (typeof v === 'string' && !idClasses.has(v)) idClasses.set(v, cls)
        }
      }
    }
    const cls = idClasses.get(id)
    if (!cls) return undefined
    const saved = ctx.cap
    ctx.cap = newCapture()
    try {
      runCreatePrefab(ctx, cls)
      return ctx.cap.nameRef
    } finally {
      ctx.cap = saved
    }
  }
  return nameRefOf
}
