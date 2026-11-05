import { PHASE_LABELS, PHASES, type BaselineEntry, type FixtureRun } from './compare.ts'
import { ms, percent, printTable } from './format.ts'

type Comparison = { phase: string; change: number }[]

/** Print the per-phase table for one fixture. */
export function printPhaseTable(
  run: FixtureRun,
  current: BaselineEntry,
  comparison: Comparison | undefined,
  confirmed: string[],
): void {
  const rows: string[][] = [['phase', 'median', 'min', 'max', 'vs baseline']]
  for (const phase of PHASES) {
    const samples = run.phasesMs[phase]
    const row = comparison?.find((c) => c.phase === phase)
    rows.push([
      PHASE_LABELS[phase],
      ms(current.phasesMs[phase]),
      ms(Math.min(...samples)),
      ms(Math.max(...samples)),
      row ? `${percent(row.change)}${confirmed.includes(phase) ? '  REGRESSION' : ''}` : '-',
    ])
  }
  const total = (pick: (samples: number[]) => number) =>
    PHASES.reduce((sum, phase) => sum + pick(run.phasesMs[phase]), 0)
  rows.push([
    'total',
    ms(PHASES.reduce((sum, phase) => sum + current.phasesMs[phase], 0)),
    ms(total((s) => Math.min(...s))),
    ms(total((s) => Math.max(...s))),
    '',
  ])
  printTable(rows)
}
