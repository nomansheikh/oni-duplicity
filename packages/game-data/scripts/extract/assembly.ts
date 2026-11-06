import { readFileSync } from 'node:fs'

/** Upper-cased identifier → identifiers found as UTF-16 string literals in the assembly. */
export function readAssemblyLiterals(path: string): Map<string, string[]> {
  const bytes = readFileSync(path)
  const byUpper = new Map<string, string[]>()
  let run = ''
  const flush = () => {
    if (run.length >= 2 && /^[A-Za-z][A-Za-z0-9_]*$/.test(run)) {
      const key = run.toUpperCase()
      const list = byUpper.get(key) ?? []
      if (!list.includes(run)) list.push(run)
      byUpper.set(key, list)
    }
    run = ''
  }
  for (let i = 0; i + 1 < bytes.length; i += 1) {
    const c = bytes[i]!
    if (bytes[i + 1] === 0 && c >= 0x20 && c < 0x7f) {
      run += String.fromCharCode(c)
      i += 1
    } else {
      flush()
    }
  }
  flush()
  return byUpper
}

/** IDs written with underscores in string keys (CALORIE_BURN) match literals without them (CalorieBurn). */
const normalize = (s: string) => s.toUpperCase().replace(/_/g, '')

/** Rank candidate spellings: PascalCase IDs first, then other mixed case, lower, upper. */
function rank(candidate: string): number {
  if (/^[A-Z][a-z]/.test(candidate)) return 0
  if (/[a-z]/.test(candidate) && /[A-Z]/.test(candidate)) return 1
  if (candidate === candidate.toLowerCase()) return 2
  return 3
}

export function literalFor(literals: Map<string, string[]>, upperKey: string): string | undefined {
  const wanted = normalize(upperKey)
  const candidates: string[] = []
  for (const [key, list] of literals) if (normalize(key) === wanted) candidates.push(...list)
  return candidates.sort((a, b) => rank(a) - rank(b))[0]
}
