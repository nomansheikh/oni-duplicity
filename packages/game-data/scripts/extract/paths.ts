import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_PATHS = [
  join(
    homedir(),
    'Library/Application Support/Steam/steamapps/common/OxygenNotIncluded/OxygenNotIncluded.app/Contents/Resources/Data',
  ),
  'C:/Program Files (x86)/Steam/steamapps/common/OxygenNotIncluded/OxygenNotIncluded_Data',
  join(homedir(), '.steam/steam/steamapps/common/OxygenNotIncluded/OxygenNotIncluded_Data'),
]

export function dataDir(): string {
  const env = process.env.ONI_PATH
  const candidates = env
    ? [
        env,
        join(env, 'OxygenNotIncluded.app/Contents/Resources/Data'),
        join(env, 'OxygenNotIncluded_Data'),
      ]
    : DEFAULT_PATHS
  const found = candidates.find((p) =>
    existsSync(join(p, 'StreamingAssets/strings/strings_template.pot')),
  )
  if (!found) throw new Error(`Game data not found. Set ONI_PATH. Tried:\n${candidates.join('\n')}`)
  return found
}

export function decompDir(): string {
  const candidates = [
    process.env.ONI_DECOMP,
    fileURLToPath(new URL('../../../../.cache/ONI_Decomp', import.meta.url)),
  ].filter((p): p is string => !!p)
  const found = candidates.find((p) => existsSync(join(p, 'Assembly-CSharp/EntityTemplates.cs')))
  if (!found) {
    throw new Error(
      `Decompiled game source not found. Run: git clone --depth 1 https://github.com/Kupie/ONI_Decomp .cache/ONI_Decomp\n(or set ONI_DECOMP). Tried:\n${candidates.join('\n')}`,
    )
  }
  return found
}
