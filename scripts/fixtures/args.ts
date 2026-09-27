import type { TierSelection } from './manifest.ts'

export function parseTierArg(argv: string[]): TierSelection {
  let selection: TierSelection = 'all'
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg !== '--tier') {
      throw new Error(`Unknown argument: ${arg}. Usage: vp run fixtures [--tier small|all]`)
    }
    const value = argv[++i]
    if (value !== 'small' && value !== 'all') {
      throw new Error(`--tier must be "small" or "all", got ${value ?? 'nothing'}`)
    }
    selection = value
  }
  return selection
}
