import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The oracle: konove's fork of oni-save-parser. It is built from source at a pinned commit
 * instead of being a dependency, so the lockfile and `vp install` stay untouched.
 */
export const ORACLE_REPO = 'https://github.com/konove/oni-save-parser.git'
export const ORACLE_SHA = '3bb607635db8203cd858b408a68e659df19e460a'

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim()
}

/** Returns the directory of the built oracle, cloning and building it on first use. */
export function ensureOracle(root: string): string {
  const dir = join(root, '.cache', 'oracle', ORACLE_SHA)
  const marker = join(dir, '.built')
  if (existsSync(marker) && existsSync(join(dir, 'lib', 'index.js'))) return dir

  console.log(`Building oracle ${ORACLE_REPO} @ ${ORACLE_SHA.slice(0, 7)} into ${dir}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  run('git', ['init', '--quiet'], dir)
  run('git', ['fetch', '--quiet', '--depth', '1', ORACLE_REPO, ORACLE_SHA], dir)
  run('git', ['checkout', '--quiet', 'FETCH_HEAD'], dir)
  const head = run('git', ['rev-parse', 'HEAD'], dir)
  if (head !== ORACLE_SHA) throw new Error(`Oracle checkout is ${head}, expected ${ORACLE_SHA}`)

  // `npm ci` runs the package's `prepare` script, which compiles lib/.
  run('npm', ['ci', '--no-audit', '--no-fund'], dir)
  if (!existsSync(join(dir, 'lib', 'index.js')))
    throw new Error('Oracle build produced no lib/index.js')
  writeFileSync(marker, `${ORACLE_SHA}\n`)
  return dir
}
