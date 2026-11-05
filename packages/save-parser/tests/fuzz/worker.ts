// Runs fuzz cases in a worker thread so the main thread can terminate a hung parse.
import { parentPort, workerData } from 'node:worker_threads'
import { ParseError } from '../../src/binary.ts'
import { parseBody, parseSave, readSaveParts, writeBody, writeSaveParts } from '../../src/save.ts'
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

function run(fuzzCase: FuzzCase): Reply {
  const target = targetOf(fuzzCase.category)
  const mutated = applyCase(target === 'file' ? layout.file : layout.body, fuzzCase)
  let write: () => void
  try {
    if (target === 'file') {
      const save = parseSave(mutated)
      write = () => void writeSaveParts(save)
    } else {
      const parsed = parseBody(mutated, templates)
      write = () => void writeBody({ ...parsed, templates } as Parameters<typeof writeBody>[0])
    }
  } catch (error) {
    return error instanceof ParseError
      ? { outcome: 'parse-error', message: error.message }
      : describe(error, '')
  }
  // A mutation that still parses must stay writable without a stray exception.
  try {
    write()
  } catch (error) {
    return error instanceof ParseError ? { outcome: 'ok' } : describe(error, 'write')
  }
  return { outcome: 'ok' }
}

port.on('message', (message: { index: number; case: FuzzCase }) => {
  const started = performance.now()
  const reply = run(message.case)
  port.postMessage({ index: message.index, ms: performance.now() - started, ...reply })
})
port.postMessage('ready')
