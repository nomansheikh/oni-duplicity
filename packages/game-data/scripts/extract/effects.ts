import { readFileSync } from 'node:fs'

/** One attribute change of an effect, as written in the MinionModifiers table. */
interface EffectModifierRow {
  attribute: string
  value: number
  units: string
  multiplier: boolean
}

export interface EffectDetailRow {
  id: string
  bad: boolean
  /** Cycles; 0 when the effect lasts until something removes it. */
  duration: number
  modifiers: EffectModifierRow[]
}

/** Splits CSV text into rows, honouring quoted fields (which may hold commas). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else field += c
  }
  if (field || row.length > 0) rows.push([...row, field])
  return rows
}

/**
 * The game's `MinionModifiers` table is a CSV text asset in resources.assets (Unity writes the
 * asset name, a 4-byte length and then the text). `ModifierSet.LoadEffects` builds each effect
 * from the first row of an ID (name, duration, `IsBad`) and adds one attribute modifier per row.
 * `Duration` is in cycles; `PerDay` values are per cycle.
 */
export function readEffectDetails(path: string): EffectDetailRow[] {
  const bytes = readFileSync(path)
  const marker = bytes.indexOf('MinionModifiers\0')
  if (marker < 0) throw new Error('MinionModifiers table not found in resources.assets')
  const at = (marker + 'MinionModifiers'.length + 3) & ~3
  const length = bytes.readUInt32LE(at)
  const [header, ...rows] = parseCsv(bytes.subarray(at + 4, at + 4 + length).toString('utf8'))
  const col = (name: string) => header!.indexOf(name)
  const [id, type, attribute, value, units, multiplier, duration, isBad] = [
    'Id',
    'Type',
    'Attribute',
    'Value',
    'Units',
    'Multiplier',
    'Duration',
    'IsBad',
  ].map(col) as [number, number, number, number, number, number, number, number]
  const effects = new Map<string, EffectDetailRow>()
  for (const row of rows) {
    if (row[type] !== 'Effect' || !row[id]) continue
    let effect = effects.get(row[id]!)
    if (!effect) {
      effect = {
        id: row[id]!,
        bad: row[isBad] === '1',
        duration: Number(row[duration] || 0),
        modifiers: [],
      }
      effects.set(effect.id, effect)
    }
    if (row[attribute]) {
      effect.modifiers.push({
        attribute: row[attribute]!,
        value: Number(row[value]),
        units: row[units] || 'Flat',
        multiplier: row[multiplier] === '1',
      })
    }
  }
  return [...effects.values()].sort((a, b) => a.id.localeCompare(b.id))
}
