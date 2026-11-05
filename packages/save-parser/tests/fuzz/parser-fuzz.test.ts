import { availableParallelism } from 'node:os'
import { fileURLToPath } from 'node:url'
import { beforeAll, expect, test } from 'vite-plus/test'
import { runCases } from './runner.ts'
import {
  BASE_COUNTS,
  CATEGORIES,
  describeCase,
  generateCase,
  readLayout,
  type CaseResult,
  type Category,
  type FuzzCase,
} from './shared.ts'

// Corrupt input must end in a ParseError. A mutation that still parses is fine only if it writes
// back, the written bytes parse again, and writing that result gives the same bytes (idempotence).
// A ParseError from the writer or from re-parsing our own output is a bug, as is anything else
// (TypeError, RangeError, raw zlib errors, a hang, out of memory).
//
// Knobs, all optional:
//   FUZZ_SEED         string seed, default below; failure messages print it
//   FUZZ_SCALE        multiplier on the case counts, default 1 (about 500 cases)
//   FUZZ_DEADLINE_MS  per-case deadline before the worker is terminated, default 5000
//   FUZZ_ONLY         replay one case, e.g. FUZZ_ONLY=body-objects#37 (independent of FUZZ_SCALE;
//                     an unknown name fails)
//   FUZZ_VERBOSE      print per-category counts

const fixture = fileURLToPath(
  new URL('../../../../test-data/saves/apple-park.sav', import.meta.url),
)
const seed = process.env.FUZZ_SEED ?? 'duplicity'
const scale = Math.max(1, Number(process.env.FUZZ_SCALE) || 1)
// A valid parse of the fixture takes about 0.1 s, so five seconds leaves a wide margin.
const deadlineMs = Number(process.env.FUZZ_DEADLINE_MS) || 5000
const only = process.env.FUZZ_ONLY

const results = new Map<Category, CaseResult[]>()

beforeAll(async () => {
  const layout = readLayout(fixture)
  const cases: FuzzCase[] = []
  if (only === undefined) {
    for (const category of CATEGORIES) {
      for (let i = 0; i < BASE_COUNTS[category] * scale; i++) {
        cases.push(generateCase(layout, seed, category, i))
      }
    }
  } else {
    // A replay is generated directly, so it does not depend on FUZZ_SCALE.
    const [category, index] = only.split('#')
    if (!CATEGORIES.includes(category as Category) || !/^\d+$/.test(index ?? '')) {
      throw new Error(
        `FUZZ_ONLY="${only}" is not <category>#<index>; categories: ${CATEGORIES.join(', ')}`,
      )
    }
    cases.push(generateCase(layout, seed, category as Category, Number(index)))
  }
  const all = await runCases({
    fixturePath: fixture,
    cases,
    deadlineMs,
    concurrency: Math.min(4, Math.max(1, availableParallelism() - 1)),
  })
  for (const category of CATEGORIES) results.set(category, [])
  for (const result of all) results.get(result.case.category)!.push(result)
  if (process.env.FUZZ_VERBOSE) {
    for (const [category, list] of results) {
      const count = (outcome: string) => list.filter((r) => r.outcome === outcome).length
      console.log(
        `${category}: ${list.length} cases, ${count('ok')} parsed, ${count('parse-error')} ParseError, ${count('bug')} bugs`,
      )
    }
  }
}, 600_000)

function report(category: Category, bugs: CaseResult[]): string {
  const groups = new Map<string, CaseResult[]>()
  for (const bug of bugs) {
    const frame =
      bug.stack
        ?.split('\n')
        .find((line) => line.includes('/src/'))
        ?.trim() ?? ''
    const key = `${bug.kind}: ${bug.message?.replace(/\d+/g, 'N')} ${frame.replace(/:\d+:\d+\)?$/, '')}`
    groups.set(key, [...(groups.get(key) ?? []), bug])
  }
  const lines = [
    `${category}: ${bugs.length} of ${results.get(category)!.length} cases failed (seed "${seed}")`,
  ]
  for (const [key, group] of groups) {
    const example = group[0]!
    lines.push(
      `  ${group.length}x ${key}`,
      `    example: FUZZ_SEED=${seed} FUZZ_ONLY=${example.case.name} (${describeCase(example.case)})`,
      `    message: ${example.message}`,
    )
  }
  return lines.join('\n')
}

for (const category of CATEGORIES) {
  test(`${category}: corrupt input ends in ParseError or a stable round trip`, () => {
    const list = results.get(category)!
    const bugs = list.filter((r) => r.outcome === 'bug')
    expect(bugs.length, report(category, bugs)).toBe(0)
  })
}

test('truncating the decompressed body never parses', () => {
  const list = results.get('body-truncate')!
  expect(list.filter((r) => r.outcome === 'ok').map((r) => r.case.name)).toEqual([])
})

test('the fuzzer reaches the parser checks', () => {
  // Guards against a harness that silently stops exercising the parser.
  if (only !== undefined) return
  for (const category of CATEGORIES) {
    const list = results.get(category)!
    expect(list.filter((r) => r.outcome === 'parse-error').length, category).toBeGreaterThan(0)
  }
})
