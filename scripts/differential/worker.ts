// Child process: compares one fixture and prints the report as JSON on the last stdout line.
// Usage: node worker.ts <oracle dir> <fixture path>
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { parseSave } from '../../packages/save-parser/src/index.ts'
import { compareSaves } from './compare.ts'

const [oracleDir, file] = process.argv.slice(2)
if (!oracleDir || !file) throw new Error('Usage: worker.ts <oracle dir> <fixture path>')

const require = createRequire(import.meta.url)
const { parseSaveGame } = require(join(oracleDir, 'lib')) as {
  parseSaveGame: (data: ArrayBuffer, options: { versionStrictness: string }) => unknown
}

const buffer = readFileSync(file)
const data = buffer.buffer.slice(
  buffer.byteOffset,
  buffer.byteOffset + buffer.byteLength,
) as ArrayBuffer

const start = performance.now()
// Minor versions 33, 35 and 37 are missing from the oracle's list but parse identically.
const theirs = parseSaveGame(data, { versionStrictness: 'major' })
const theirMs = Math.round(performance.now() - start)
const ours = parseSave(new Uint8Array(data))
const ourMs = Math.round(performance.now() - start - theirMs)

const report = compareSaves(theirs, ours)
console.log(
  JSON.stringify({
    ...report,
    version: `${ours.version.major}.${ours.version.minor}`,
    theirMs,
    ourMs,
    rssMb: Math.round(process.memoryUsage.rss() / 1048576),
  }),
)
