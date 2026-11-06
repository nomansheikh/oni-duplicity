/** Small helpers for reading the decompiled C# the skill extraction depends on. */
import type { SkillCond as Cond } from '../../src/skill-tree.ts'

export interface Statement {
  text: string
  conds: Cond[]
}

/** Strings and comments never hold structure; skip a string literal starting at `i`. */
function skipString(text: string, i: number): number {
  let j = i + 1
  while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1
  return j
}

/** Index of the bracket closing the one at `open`. */
export function matchBracket(text: string, open: number): number {
  const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']' }
  const stack: string[] = []
  for (let i = open; i < text.length; i += 1) {
    const c = text[i]!
    if (c === '"') i = skipString(text, i)
    else if (pairs[c]) stack.push(pairs[c]!)
    else if (c === stack[stack.length - 1]) {
      stack.pop()
      if (stack.length === 0) return i
    }
  }
  throw new Error(`No closing bracket for index ${open}`)
}

/** Splits at commas that are not inside brackets or strings. */
export function splitArgs(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!
    if (c === '"') i = skipString(text, i)
    else if ('({['.includes(c)) depth += 1
    else if (')}]'.includes(c)) depth -= 1
    else if (c === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(text.slice(start).trim())
  return parts
}

/** The text inside the first `{ ... }` after `marker`. */
export function blockAfter(source: string, marker: string): string {
  const at = source.indexOf(marker)
  if (at < 0) throw new Error(`"${marker}" not found`)
  const open = source.indexOf('{', at)
  return source.slice(open + 1, matchBracket(source, open))
}

const DLC_FEATURES: Record<string, string> = {
  // DlcManager is not in the decompile this was written against. These are the checks the
  // skill files use; each is true exactly when Spaced Out is active.
  IsExpansion1Active: 'EXPANSION1_ID',
  FeatureClusterSpaceEnabled: 'EXPANSION1_ID',
  FeaturePlantMutationsEnabled: 'EXPANSION1_ID',
}

/** `!DlcManager.IsContentSubscribed("DLC3_ID")` and the feature checks above. */
export function parseCond(expression: string): Cond {
  let expr = expression.trim()
  const active = !expr.startsWith('!')
  if (!active) expr = expr.slice(1)
  const content = /^DlcManager\.IsContentSubscribed\("(\w+)"\)$/.exec(expr)
  if (content) return { dlc: content[1]!, active }
  const feature = /^DlcManager\.(\w+)\(\)$/.exec(expr)
  const dlc = feature && DLC_FEATURES[feature[1]!]
  if (!dlc) throw new Error(`Unknown condition: ${expression}`)
  return { dlc, active }
}

/**
 * Splits a constructor body into statements, each with the `if` / `else` conditions it sits
 * under. Braces inside parentheses (list initialisers) belong to the statement.
 */
export function readStatements(body: string): Statement[] {
  const out: Statement[] = []
  const frames: Cond[][] = []
  const lastIf: (Cond | null)[] = [null]
  let buf = ''
  let depth = 0
  const conds = () => frames.flat()
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i]!
    if (c === '"') {
      const end = skipString(body, i)
      buf += body.slice(i, end + 1)
      i = end
    } else if (c === '{' && depth === 0) {
      const header = buf.trim()
      const cond = /^if\s*\(([\s\S]*)\)$/.exec(header)
      if (cond) {
        const parsed = parseCond(cond[1]!)
        lastIf[frames.length] = parsed
        frames.push([parsed])
      } else if (header === 'else') {
        const previous = lastIf[frames.length]
        if (!previous) throw new Error('else without if')
        frames.push([{ ...previous, active: !previous.active }])
      } else throw new Error(`Unsupported block: ${header}`)
      lastIf.length = frames.length + 1
      lastIf[frames.length] = null
      buf = ''
    } else if (c === '}' && depth === 0) {
      frames.pop()
      lastIf.length = frames.length + 1
      buf = ''
    } else if (c === ';' && depth === 0) {
      if (buf.trim()) out.push({ text: buf.trim(), conds: conds() })
      buf = ''
    } else {
      if ('({'.includes(c)) depth += 1
      else if (')}'.includes(c)) depth -= 1
      buf += c
    }
  }
  return out
}
