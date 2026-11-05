import type { TierSelection } from './manifest.ts'

const USAGE = 'Usage: vp run fixtures [--tier small|all] [--file <name> ...]'

export interface FixtureArgs {
  tier: TierSelection
  /** When set, only these files are fetched. Cannot be combined with --tier. */
  files: string[]
}

export function parseFixtureArgs(argv: string[]): FixtureArgs {
  const args: FixtureArgs = { tier: 'all', files: [] }
  let tierGiven = false
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--tier') {
      const value = argv[++i]
      if (value !== 'small' && value !== 'all') {
        throw new Error(`--tier must be "small" or "all", got ${value ?? 'nothing'}`)
      }
      args.tier = value
      tierGiven = true
    } else if (arg === '--file') {
      const value = argv[++i]
      if (!value) throw new Error(`--file needs a file name. ${USAGE}`)
      args.files.push(value)
    } else {
      throw new Error(`Unknown argument: ${arg}. ${USAGE}`)
    }
  }
  if (args.files.length > 0 && tierGiven) {
    throw new Error(
      `--file and --tier cannot be combined: --file selects fixtures by name. ${USAGE}`,
    )
  }
  return args
}

export function parseTierArg(argv: string[]): TierSelection {
  return parseFixtureArgs(argv).tier
}
