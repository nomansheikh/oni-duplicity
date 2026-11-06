import type { Layout } from './layout.ts'
import type { Category, Edit, FuzzCase } from './types.ts'

/** Mulberry32 seeded from a string, so every case is reproducible from (seed, category, index). */
export function rng(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The parts of [from, to) that are not opaque payload. */
function structuralIntervals(
  opaque: [number, number][],
  from: number,
  to: number,
): [number, number][] {
  const out: [number, number][] = []
  let cursor = from
  for (const [start, end] of opaque) {
    if (end <= cursor || start >= to) continue
    if (start > cursor) out.push([cursor, start])
    cursor = Math.max(cursor, end)
  }
  if (cursor < to) out.push([cursor, to])
  return out
}

function pickEdits(
  random: () => number,
  buffer: Uint8Array,
  from: number,
  to: number,
  /** When given, most edits land in these intervals instead of anywhere in [from, to). */
  structural?: [number, number][],
): Edit[] {
  const below = (n: number) => Math.floor(random() * n)
  const mutate = (before: number): number => {
    switch (below(6)) {
      case 0:
        return before ^ (1 << below(8))
      case 1:
        return below(256)
      case 2:
        return 0x00
      case 3:
        return 0xff
      case 4:
        return 0x7f
      default:
        return 0x80
    }
  }
  const edits: Edit[] = []
  const add = (offset: number) => {
    const before = buffer[offset]!
    let after = mutate(before)
    if (after === before) after = before ^ 0x01
    if (!edits.some((e) => e.offset === offset)) edits.push({ offset, before, after })
  }
  const total = structural?.reduce((sum, [a, b]) => sum + (b - a), 0) ?? 0
  const position = (): number => {
    if (!structural || total === 0 || random() < 0.2) return from + below(to - from)
    let at = below(total)
    for (const [a, b] of structural) {
      if (at < b - a) return a + at
      at -= b - a
    }
    return from
  }
  if (random() < 0.15) {
    // A burst over a few adjacent bytes, enough to rewrite a whole int32 length or count.
    const start = Math.min(position(), to - 1)
    const width = 2 + below(3)
    for (let i = 0; i < width && start + i < to; i++) add(start + i)
  } else {
    const count = 1 + below(3)
    for (let i = 0; i < count; i++) add(position())
  }
  return edits.sort((a, b) => a.offset - b.offset)
}

export function generateCase(
  layout: Layout,
  seed: string,
  category: Category,
  index: number,
): FuzzCase {
  const random = rng(`${seed}:${category}:${index}`)
  const name = `${category}#${index}`
  const { file, body, headerEnd, templatesEnd, simStart, objectsStart } = layout
  switch (category) {
    case 'file-truncate': {
      // Uniform lengths nearly always land in the zlib stream, so aim every other case at the
      // header and the templates, where the parser's own checks run.
      const limit = index % 2 === 0 ? templatesEnd + 64 : file.length
      return { name, category, truncateTo: Math.floor(random() * limit), edits: [] }
    }
    case 'body-truncate':
      return { name, category, truncateTo: Math.floor(random() * body.length), edits: [] }
    case 'header':
      return { name, category, edits: pickEdits(random, file, 0, headerEnd) }
    case 'templates':
      return { name, category, edits: pickEdits(random, file, headerEnd, templatesEnd) }
    case 'compressed-body':
      return { name, category, edits: pickEdits(random, file, templatesEnd, file.length) }
    case 'body-preamble':
      return {
        name,
        category,
        edits: pickEdits(
          random,
          body,
          0,
          simStart,
          structuralIntervals(layout.opaque, 0, simStart),
        ),
      }
    case 'body-objects':
      return {
        name,
        category,
        edits: pickEdits(
          random,
          body,
          objectsStart,
          body.length,
          structuralIntervals(layout.opaque, objectsStart, body.length),
        ),
      }
  }
}

/** Target buffer a category mutates: the whole file, or the decompressed body. */
export function targetOf(category: Category): 'file' | 'body' {
  return category.startsWith('body-') ? 'body' : 'file'
}

export function applyCase(original: Uint8Array, fuzzCase: FuzzCase): Uint8Array {
  const end = fuzzCase.truncateTo ?? original.length
  const copy = original.slice(0, end)
  for (const edit of fuzzCase.edits) copy[edit.offset] = edit.after
  return copy
}

export function describeCase(fuzzCase: FuzzCase): string {
  if (fuzzCase.truncateTo !== undefined) return `truncate to ${fuzzCase.truncateTo} bytes`
  return fuzzCase.edits
    .map((e) => `[${e.offset}] 0x${e.before.toString(16)} -> 0x${e.after.toString(16)}`)
    .join(', ')
}
