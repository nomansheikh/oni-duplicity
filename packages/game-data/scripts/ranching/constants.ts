import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Stable size, rancher timings and the base metabolism, read from the game source text. */
export function readConstants(decompDir: string, gaps: string[]) {
  const source = (file: string) => readFileSync(join(decompDir, 'Assembly-CSharp', file), 'utf8')
  const found = (re: RegExp, text: string, what: string) => {
    const v = re.exec(text)?.[1]
    if (v === undefined) gaps.push(what)
    return v === undefined ? 0 : Number(v)
  }
  const metabolismBase = Number(
    /"Metabolism", false, [^,]+, false, ([\d.]+)f/.exec(
      source('Database/CritterAttributes.cs'),
    )?.[1],
  )
  if (!Number.isFinite(metabolismBase)) gaps.push('metabolism base value')
  const station = source('RanchStationConfig.cs')
  const rooms = source('Database/RoomTypes.cs')
  const pen = /this\.CreaturePen = base\.Add\([\s\S]*?\}, new RoomDetails/.exec(rooms)?.[0] ?? ''
  const constraints = source('RoomConstraints.cs')
  const minCells = found(/MINIMUM_SIZE_(\d+)/, pen, 'stable minimum size')
  const maxCells = found(/MAXIMUM_SIZE_(\d+)/, pen, 'stable maximum size')
  if (!new RegExp(`MINIMUM_SIZE_${minCells} = [^;]*NumCells >= ${minCells}`).test(constraints))
    gaps.push('stable minimum constraint mismatch')
  if (!new RegExp(`MAXIMUM_SIZE_${maxCells} = [^;]*NumCells <= ${maxCells}`).test(constraints))
    gaps.push('stable maximum constraint mismatch')
  const rancher = {
    workSeconds: found(/def\.WorkTime = ([\d.]+)f/, station, 'ranch work time'),
    ranchedEffectSeconds: found(
      /new Effect\("Ranched",[^;]*?, ([\d.]+)f, true, true, false/,
      source('ModifierSet.cs'),
      'ranched effect duration',
    ),
    durationPerRanchingPoint: found(/1f \+ num \* ([\d.]+)f/, station, 'ranching skill multiplier'),
  }
  return { stable: { minCells, maxCells }, rancher, metabolismBase }
}
