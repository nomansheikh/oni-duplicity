import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Obj } from '../csharp/interp.ts'
import type { RawElement } from './types.ts'
import { stub } from './util.ts'

export function readElements(dataDir: string): RawElement[] {
  const elements: RawElement[] = []
  for (const [file, state] of [
    ['solid', 'Solid'],
    ['liquid', 'Liquid'],
    ['gas', 'Gas'],
  ] as const) {
    const text = readFileSync(join(dataDir, `StreamingAssets/elements/${file}.yaml`), 'utf8')
    for (const block of text.split(/\n {2}- elementId: /).slice(1)) {
      const id = block.split(/[\s#]/)[0]!
      const field = (key: string) =>
        new RegExp(`\\n\\s+${key}:\\s*"?([^"\\n#]*)"?`).exec(block)?.[1]?.trim()
      const tags = /\n\s+tags:\n((?:\s+- .*\n?)*)/
        .exec(block)?.[1]
        ?.split('\n')
        .map((l) => l.replace(/^\s*-\s*/, '').trim())
        .filter(Boolean)
      elements.push({
        id,
        state,
        materialCategory: field('materialCategory') ?? '',
        tags: tags ?? [],
        disabled: field('isDisabled') === 'true',
        ...(field('refinedMetalTarget')
          ? { refinedMetalTarget: field('refinedMetalTarget')! }
          : {}),
      })
    }
  }
  return elements
}

export const elementStubs = (elements: RawElement[]): Obj[] =>
  elements.map((e) =>
    stub('Element', {
      id: e.id,
      tag: e.id,
      IsSolid: e.state === 'Solid',
      materialCategory: e.materialCategory,
      tags: e.tags,
      disabled: e.disabled,
      refinedMetalTarget: e.refinedMetalTarget,
    }),
  )
