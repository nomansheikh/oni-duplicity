import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import type { FixtureRun } from './compare.ts'

const WORKER_TIMEOUT_MS = 10 * 60 * 1000

export function runFixture(file: string, fetchedDir: string, iterations: number): FixtureRun {
  const result = spawnSync(
    process.execPath,
    [
      '--expose-gc',
      join(import.meta.dirname, 'worker.ts'),
      join(fetchedDir, file),
      String(iterations),
    ],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
      maxBuffer: 1 << 20,
      timeout: WORKER_TIMEOUT_MS,
    },
  )
  if (result.error) {
    const timedOut = (result.error as NodeJS.ErrnoException).code === 'ETIMEDOUT'
    throw new Error(
      timedOut
        ? `Measuring ${file} took longer than ${WORKER_TIMEOUT_MS / 60000} minutes and was stopped`
        : `Measuring ${file} could not run: ${result.error.message}`,
    )
  }
  if (result.signal) throw new Error(`Measuring ${file} was killed by ${result.signal}`)
  if (result.status !== 0) throw new Error(`Measuring ${file} failed (exit ${result.status})`)
  return JSON.parse(result.stdout.trim().split('\n').at(-1)!)
}
