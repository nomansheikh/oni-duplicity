import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** `SubWorld.ZoneType` in the decompile; the ids are exactly what the generator reports. */
const ENUM_FILE = 'Assembly-CSharp-firstpass/ProcGen/SubWorld.cs'

function yamlsUnder(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return yamlsUnder(path)
    return entry.name.endsWith('.yaml') ? [path] : []
  })
}

/** The `zoneType:` values of every subworld YAML, base game and DLCs, in nested folders too. */
function usedZoneTypes(gameDir: string): Set<string> {
  const roots = [join(gameDir, 'StreamingAssets/worldgen')]
  const dlcDir = join(gameDir, 'StreamingAssets/dlc')
  if (existsSync(dlcDir))
    for (const name of readdirSync(dlcDir)) roots.push(join(dlcDir, name, 'worldgen'))
  const used = new Set<string>()
  for (const root of roots) {
    for (const file of yamlsUnder(join(root, 'subworlds'))) {
      for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const match = /^zoneType:\s*([A-Za-z]+)/.exec(line)
        if (match) used.add(match[1]!)
      }
    }
  }
  return used
}

/**
 * Every zone type the generator can emit, in enum order. The enum is read rather than the YAMLs
 * because it also lists the types no shipped subworld uses; each `zoneType:` in the YAMLs must be
 * in it, or the extract fails.
 */
export function readZoneTypes(decomp: string, gameDir: string): string[] {
  const text = readFileSync(join(decomp, ENUM_FILE), 'utf8')
  const body = /enum ZoneType\s*\{([^}]*)\}/.exec(text)?.[1]
  if (!body) throw new Error(`No ZoneType enum in ${ENUM_FILE}`)
  const ids = body
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/\/\/.*$/, '')
        .replace(/,/g, '')
        .trim(),
    )
    .filter(Boolean)
  for (const id of usedZoneTypes(gameDir)) {
    if (!ids.includes(id)) throw new Error(`Subworld zoneType ${id} is not in the ZoneType enum`)
  }
  return ids
}
