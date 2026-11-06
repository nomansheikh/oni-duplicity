import type { Entry, Kind, Loose } from './types.ts'

function pattern(path: string): string {
  return path.replace(/\[\d+\]/g, '[]').replace(/gameObjects<[^>]+>/g, 'gameObjects<*>')
}

export function show(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, x) =>
      typeof x === 'bigint'
        ? `${x}n`
        : x instanceof ArrayBuffer || ArrayBuffer.isView(x)
          ? `<bytes ${x.byteLength}>`
          : x,
    )!.slice(0, 160)
  } catch {
    return String(value)
  }
}

export interface Recorder {
  /** Number of values `cmp` has visited. */
  compared: number
  record(kind: Kind, category: string, path: string, detail: string): void
  real(category: string, path: string, a: unknown, b: unknown): void
  /** Any defined key outside `allowed` is something the comparison would otherwise never look at. */
  checkKeys(value: Loose, allowed: readonly string[], side: string, path: string): void
  entries(): Entry[]
}

export function createRecorder(): Recorder {
  const stats = new Map<string, Entry>()
  const rec: Recorder = {
    compared: 0,
    record(kind, category, path, detail) {
      const key = `${kind}|${category}|${pattern(path)}`
      const entry = stats.get(key)
      if (entry) entry.count++
      else
        stats.set(key, {
          kind,
          category,
          pattern: pattern(path),
          count: 1,
          example: `${path}: ${detail}`,
        })
    },
    real(category, path, a, b) {
      rec.record('real', category, path, `theirs=${show(a)} ours=${show(b)}`)
    },
    checkKeys(value, allowed, side, path) {
      for (const key of Object.keys(value)) {
        if (value[key] !== undefined && !allowed.includes(key)) {
          rec.record('real', `unexpected key in ${side}`, `${path}.${key}`, show(value[key]))
        }
      }
    },
    entries() {
      const order: Record<Kind, number> = { real: 0, known: 1, representation: 2 }
      return [...stats.values()].sort(
        (x, y) =>
          order[x.kind] - order[y.kind] ||
          x.category.localeCompare(y.category) ||
          x.pattern.localeCompare(y.pattern),
      )
    },
  }
  return rec
}
