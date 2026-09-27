import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vite-plus/test'
import { parseBody, parseSave, readSaveParts, writeBody, writeSave } from '../src/index.ts'

const root = fileURLToPath(new URL('../../../test-data/', import.meta.url))
const manifest = JSON.parse(readFileSync(`${root}fixtures.json`, 'utf8')) as {
  fixtures: { file: string; committed: boolean; tier: string }[]
}
// Keep the default run fast: large saves only when FIXTURE_TIER=all.
const tier = process.env.FIXTURE_TIER === 'all' ? 'all' : 'small'
const fixtures = manifest.fixtures
  .filter((f) => tier === 'all' || f.tier === 'small')
  .map((f) => ({ ...f, path: `${root}${f.committed ? 'saves' : 'fetched'}/${f.file}` }))
  .filter((f) => existsSync(f.path))
// The largest saves take several seconds each, more when test files run in parallel.
const timeout = 120_000

test.each(fixtures)(
  '$file round-trips byte for byte',
  ({ path }) => {
    const { templates, body } = readSaveParts(readFileSync(path))
    const parsed = parseBody(body, templates)
    const written = writeBody({ ...parsed, templates } as Parameters<typeof writeBody>[0])
    expect(written.length).toBe(body.length)
    expect(Buffer.compare(written, body)).toBe(0)
  },
  timeout,
)

test.each(fixtures)(
  '$file survives write and re-parse',
  ({ path }) => {
    const save = parseSave(readFileSync(path))
    const again = parseSave(writeSave(save))
    expect(again.header).toEqual(save.header)
    expect(again.gameObjects.length).toBe(save.gameObjects.length)
  },
  timeout,
)
