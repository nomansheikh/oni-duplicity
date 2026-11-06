import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dlcArrays } from './dlcs.ts'

export interface GeyserDlcs {
  /** The geyser type id, e.g. `molten_aluminum`. */
  id: string
  /** DLCs the type needs (`GeyserType.requiredDlcIds`); empty for the base game's. */
  requiredDlcIds: string[]
}

/**
 * The DLCs each geyser type needs, from the `GeyserType` constructor calls in
 * `GeyserGenericConfig`. Its eighth and ninth arguments are the required and forbidden DLC arrays.
 */
export function readGeyserDlcs(decompDir: string): GeyserDlcs[] {
  const source = readFileSync(join(decompDir, 'Assembly-CSharp/GeyserGenericConfig.cs'), 'utf8')
  const arrays = dlcArrays(decompDir)
  const call =
    /new GeyserConfigurator\.GeyserType\("(\w+)", SimHashes\.\w+, GeyserConfigurator\.GeyserShape\.\w+, [\d.]+f, [\d.]+f, [\d.]+f, [\d.]+f, (DlcManager\.\w+|null), (DlcManager\.\w+|null)/g
  const resolve = (name: string) => {
    const ids = arrays.get(name)
    if (!ids) throw new Error(`Unknown DLC array ${name} in GeyserGenericConfig`)
    return ids
  }
  const found: GeyserDlcs[] = []
  for (const [, id, required, forbidden] of source.matchAll(call)) {
    if (forbidden !== 'null') throw new Error(`Geyser ${id} forbids ${forbidden}; not handled`)
    found.push({ id: id!, requiredDlcIds: required === 'null' ? [] : resolve(required!) })
  }
  if (found.length === 0) throw new Error('No GeyserType calls found in GeyserGenericConfig')
  return found
}
