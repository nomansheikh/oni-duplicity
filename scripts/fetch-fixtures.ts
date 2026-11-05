import { join } from 'node:path'
import { parseFixtureArgs } from './fixtures/args.ts'
import { ensureFixture, type Download } from './fixtures/ensure.ts'
import { loadManifest, selectFiles, selectFixtures } from './fixtures/manifest.ts'

const root = join(import.meta.dirname, '..')

const download: Download = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(300_000) })
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

const args = parseFixtureArgs(process.argv.slice(2))
const manifest = await loadManifest(join(root, 'test-data/fixtures.json'))

let failed = 0
const selected =
  args.files.length > 0 ? selectFiles(manifest, args.files) : selectFixtures(manifest, args.tier)
for (const fixture of selected) {
  try {
    const result = await ensureFixture(root, manifest.baseUrl, fixture, download)
    console.log(`${result === 'present' ? 'ok        ' : 'downloaded'}  ${fixture.file}`)
  } catch (error) {
    failed++
    console.error(`FAILED      ${fixture.file}: ${(error as Error).message}`)
  }
}

if (failed > 0) {
  console.error(`${failed} fixture(s) failed`)
  process.exitCode = 1
}
