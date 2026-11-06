import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { clean } from './collect.ts'

export interface DlcEntry {
  /** `EXPANSION1_ID`, `DLC2_ID`, ... as clusters, geysers and mixing settings list them. */
  id: string
  name: string
  /** The banner colour the game draws the DLC's name in, `#rrggbb`. */
  color: string
  /** The folder its content lives in under `StreamingAssets/dlc`, e.g. `expansion1`. */
  directory: string
}

const hex = (channel: string) =>
  Math.round(Number(channel.replace(/f$/, '')) * 255)
    .toString(16)
    .padStart(2, '0')

/**
 * The content DLCs from `DlcManager`: `EXPANSION1_INFO` and the `DLC_PACKS` table, cosmetic packs
 * left out. `DlcInfo` derives the folder and the title key from the id (`DLC2_ID` gives `dlc2` and
 * `STRINGS.UI.DLC2.NAME`).
 */
export function readDlcs(decompDir: string, strings: Map<string, string>): DlcEntry[] {
  const source = readFileSync(join(decompDir, 'Assembly-CSharp-firstpass/DlcManager.cs'), 'utf8')
  const info =
    /new DlcManager\.DlcInfo\("(\w+)", "\w*", new Color\(([\d.]+f?), ([\d.]+f?), ([\d.]+f?)\), "[^"]*", "[^"]*", "[^"]*", (true|false)/g
  const dlcs: DlcEntry[] = []
  for (const [, id, r, g, b, cosmetic] of source.matchAll(info)) {
    if (cosmetic === 'true' || dlcs.some((dlc) => dlc.id === id)) continue
    const directory = id!.replace('_ID', '').toLowerCase()
    const name = strings.get(`STRINGS.UI.${directory.toUpperCase()}.NAME`)
    if (!name) throw new Error(`No name string for DLC ${id}`)
    dlcs.push({ id: id!, name: clean(name), color: `#${hex(r!)}${hex(g!)}${hex(b!)}`, directory })
  }
  if (!dlcs.some((dlc) => dlc.id === 'EXPANSION1_ID')) throw new Error('DlcManager: no EXPANSION1')
  return dlcs
}

/** The base game's name, the label the game gives content that needs no DLC. */
export function baseGameName(strings: Map<string, string>): string {
  const name = strings.get('STRINGS.UI.VANILLA.NAME')
  if (!name) throw new Error('No STRINGS.UI.VANILLA.NAME')
  return clean(name)
}

/** `DlcManager.DLC2` and friends: the `string[]` constants a config names as required content. */
export function dlcArrays(decompDir: string): Map<string, string[]> {
  const source = readFileSync(join(decompDir, 'Assembly-CSharp-firstpass/DlcManager.cs'), 'utf8')
  const arrays = new Map<string, string[]>()
  for (const [, name, items] of source.matchAll(
    /public static readonly string\[\] (\w+) = new string\[\] \{([^}]*)\}/g,
  )) {
    arrays.set(
      `DlcManager.${name}`,
      [...items!.matchAll(/"(\w+)"/g)].map((m) => m[1]!),
    )
  }
  return arrays
}
