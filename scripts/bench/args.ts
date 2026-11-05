export interface BenchArgs {
  /** Rewrite the committed baseline from this run instead of checking against it. */
  update: boolean
  /** Fail, instead of skipping, when fixtures or the baseline are missing. */
  require: boolean
  /** Measured iterations per fixture, after the warm-up. */
  iterations: number
}

export const DEFAULT_ITERATIONS = 5

const USAGE = 'Usage: vp run bench [--update] [--require] [--iterations <n>]'

export function parseBenchArgs(argv: string[]): BenchArgs {
  const args: BenchArgs = { update: false, require: false, iterations: DEFAULT_ITERATIONS }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--update') args.update = true
    else if (arg === '--require') args.require = true
    else if (arg === '--iterations') {
      const value = Number(argv[++i])
      if (!Number.isInteger(value) || value < 1) {
        throw new Error(`--iterations must be a positive integer. ${USAGE}`)
      }
      args.iterations = value
    } else {
      throw new Error(`Unknown argument: ${arg}. ${USAGE}`)
    }
  }
  return args
}
