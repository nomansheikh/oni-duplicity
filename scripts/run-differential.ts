import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { parseTierArg } from './fixtures/args.ts'
import { loadManifest, selectFixtures } from './fixtures/manifest.ts'
import type { Entry } from './differential/compare.ts'
import { ensureOracle } from './differential/oracle.ts'

const root = join(import.meta.dirname, '..')
const argv = process.argv.slice(2)
// No --tier: follow FIXTURE_TIER like the tests, defaulting to the small tier.
const selection =
  argv.length > 0 ? parseTierArg(argv) : process.env.FIXTURE_TIER === 'all' ? 'all' : 'small'

const manifest = await loadManifest(join(root, 'test-data/fixtures.json'))
const oracle = ensureOracle(root)
const worker = join(import.meta.dirname, 'differential/worker.ts')

interface Result {
  comparedValues: number
  entries: Entry[]
  version: string
  theirMs: number
  ourMs: number
  rssMb: number
}

let compared = 0
let failed = 0
const started = performance.now()
for (const fixture of selectFixtures(manifest, selection)) {
  const path = join(root, 'test-data', fixture.committed ? 'saves' : 'fetched', fixture.file)
  if (!existsSync(path)) {
    console.log(`skipped   ${fixture.file} (not fetched; run \`vp run fixtures\`)`)
    continue
  }
  // One child per fixture so the oracle's memory (several GB on the largest saves) is freed.
  const child = spawnSync(process.execPath, ['--max-old-space-size=6144', worker, oracle, path], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  compared++
  if (child.status !== 0) {
    failed++
    console.error(`FAILED    ${fixture.file}: worker exited with ${child.status ?? child.signal}`)
    continue
  }
  const result = JSON.parse(child.stdout.trim().split('\n').at(-1)!) as Result
  const real = result.entries.filter((e) => e.kind === 'real')
  const status = real.length === 0 ? 'ok       ' : 'DIFFERS  '
  console.log(
    `${status} ${fixture.file} v${result.version}: ${result.comparedValues} values, oracle ${result.theirMs} ms, ours ${result.ourMs} ms, ${result.rssMb} MB`,
  )
  for (const entry of real) {
    failed++
    console.error(
      `  [${entry.count}x] ${entry.category} at ${entry.pattern}\n      e.g. ${entry.example}`,
    )
  }
}

console.log(
  `compared ${compared} fixture(s) in ${Math.round((performance.now() - started) / 1000)} s`,
)
if (compared === 0) {
  console.error('No fixtures available to compare')
  process.exitCode = 1
} else if (failed > 0) {
  console.error('Differential check failed')
  process.exitCode = 1
}
