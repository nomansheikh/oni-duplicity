// Runs fuzz cases in a worker thread so the main thread can terminate a hung parse.
import { parentPort, workerData } from 'node:worker_threads'
import { ParseError } from '../../src/binary.ts'
import { parseBody, parseSave, readSaveParts, writeBody, writeSave } from '../../src/save.ts'
import { applyCase, readLayout, targetOf, type FuzzCase, type Outcome } from './shared.ts'

const port = parentPort!
const layout = readLayout((workerData as { path: string }).path)
const { templates } = readSaveParts(layout.file)

interface Reply {
  outcome: Outcome
  kind?: string
  message?: string
  stack?: string
}

function describe(error: unknown, phase: string): Reply {
  const kind = error instanceof Error ? error.constructor.name : `non-error ${typeof error}`
  return {
    outcome: 'bug',
    kind: phase ? `${phase}:${kind}` : kind,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && Buffer.compare(a, b) === 0
}

function bug(error: unknown, phase: string): Reply {
  return describe(error, phase)
}

/**
 * A mutation that still parses must write back, re-parse its own output, and write the same bytes
 * again. A ParseError from the writer or from re-parsing our own output is a bug.
 */
function run(fuzzCase: FuzzCase): Reply {
  const target = targetOf(fuzzCase.category)
  const mutated = applyCase(target === 'file' ? layout.file : layout.body, fuzzCase)
  let write: () => Uint8Array
  let reparse: (written: Uint8Array) => () => Uint8Array
  try {
    if (target === 'file') {
      const save = parseSave(mutated)
      write = () => writeSave(save)
      reparse = (written) => {
        const again = parseSave(written)
        return () => writeSave(again)
      }
    } else {
      const parsed = parseBody(mutated, templates)
      const wrap = (p: typeof parsed) => ({ ...p, templates }) as Parameters<typeof writeBody>[0]
      write = () => writeBody(wrap(parsed))
      reparse = (written) => {
        const again = parseBody(written, templates)
        return () => writeBody(wrap(again))
      }
    }
  } catch (error) {
    return error instanceof ParseError
      ? { outcome: 'parse-error', message: error.message }
      : bug(error, '')
  }
  let first: Uint8Array
  try {
    first = write()
  } catch (error) {
    return bug(error, 'write')
  }
  let writeAgain: () => Uint8Array
  try {
    writeAgain = reparse(first)
  } catch (error) {
    return bug(error, 'reparse')
  }
  let second: Uint8Array
  try {
    second = writeAgain()
  } catch (error) {
    return bug(error, 'rewrite')
  }
  if (!sameBytes(first, second)) {
    return {
      outcome: 'bug',
      kind: 'not-idempotent',
      message: `second write differs from the first (${first.length} vs ${second.length} bytes)`,
    }
  }
  return { outcome: 'ok' }
}

port.on('message', (message: { index: number; case: FuzzCase }) => {
  const started = performance.now()
  const reply = run(message.case)
  port.postMessage({ index: message.index, ms: performance.now() - started, ...reply })
})
port.postMessage('ready')
