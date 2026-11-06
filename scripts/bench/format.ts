import type { BaselineEntry } from './compare.ts'

export const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`
export const ms = (value: number) => `${Math.round(value).toLocaleString('en-US')} ms`
export const percent = (change: number) => `${change >= 0 ? '+' : ''}${(change * 100).toFixed(0)}%`

export function printTable(rows: string[][]): void {
  const widths = rows[0]!.map((_, col) => Math.max(...rows.map((row) => row[col]!.length)))
  for (const [i, row] of rows.entries()) {
    const cells = row.map((cell, col) =>
      col === 0 ? cell.padEnd(widths[col]!) : cell.padStart(widths[col]!),
    )
    console.log(`  ${cells.join('  ')}`)
    if (i === 0) console.log(`  ${widths.map((w) => '-'.repeat(w)).join('  ')}`)
  }
}

export function roundEntry(entry: BaselineEntry): BaselineEntry {
  return {
    fileBytes: entry.fileBytes,
    calibrationMs: Math.round(entry.calibrationMs * 10) / 10,
    phasesMs: Object.fromEntries(
      Object.entries(entry.phasesMs).map(([phase, value]) => [phase, Math.round(value * 10) / 10]),
    ) as typeof entry.phasesMs,
  }
}
