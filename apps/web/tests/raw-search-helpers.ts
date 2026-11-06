import { readFileSync } from 'node:fs'
import { parseSave, writeSaveParts, type SaveGame } from '@oni-duplicity/save-parser'
import { galaxy } from './helpers.ts'
import { rawCanAdd } from '../src/worker/raw.ts'
import { rawChildren, type RawPath } from '../src/worker/model.ts'
import { fixtures } from './helpers.ts'

export const save = parseSave(readFileSync(galaxy))
export const body = (s: SaveGame) => writeSaveParts(s).body.slice()
export const all = process.env.FIXTURE_TIER === 'all'
export const smallFixtures = fixtures.filter((f) => all || !/mithro-0[3-6]/.test(f))

/** Every array the editor offers "add item" for, found by walking template-typed roots. */
export function addableArrays(s: SaveGame, limit = 200): RawPath[] {
  const out: RawPath[] = []
  const visit = (path: RawPath) => {
    if (out.length >= limit) return
    const { entries } = rawChildren(s, path, 0, 100_000)
    for (const e of entries) {
      if (e.kind === 'array' && e.canAdd) out.push(e.path)
      if ((e.kind === 'object' || e.kind === 'array') && path.length < 12) visit(e.path)
    }
  }
  for (const root of ['world', 'settings', 'gameData']) visit([root])
  return out
}
/**
 * Every array "add item" is offered for, one per distinct shape: the world, settings and game
 * data roots, and every behavior's template data (keyed by behavior name, indices ignored).
 */
export function addableShapes(save: SaveGame): Map<string, RawPath> {
  const found = new Map<string, RawPath>()
  const walk = (value: unknown, path: RawPath, key: string) => {
    if (value === null || typeof value !== 'object' || value instanceof Uint8Array) return
    if (Array.isArray(value)) {
      if (!found.has(key) && rawCanAdd(save, path)) found.set(key, [...path])
      for (let i = 0; i < value.length; i++) walk(value[i], [...path, i], `${key}.*`)
      return
    }
    for (const [name, child] of Object.entries(value))
      walk(child, [...path, name], `${key}.${name}`)
  }
  for (const root of ['world', 'settings', 'gameData'] as const) {
    walk(save[root], [root], root)
  }
  save.gameObjects.forEach((group, g) =>
    group.gameObjects.forEach((obj, i) =>
      obj.behaviors.forEach((b, j) => {
        if (b.templateData) {
          const path: RawPath = ['gameObjects', g, 'gameObjects', i, 'behaviors', j, 'templateData']
          walk(b.templateData, path, `${b.name}`)
        }
      }),
    ),
  )
  return found
}
