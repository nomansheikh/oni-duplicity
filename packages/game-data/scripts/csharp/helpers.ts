import { Ref, type Value } from './values.ts'

/** Splits `lhs op rhs` at the first top-level assignment operator. */
export function findAssign(
  text: string,
): { target: string; op: string; rhsText: string } | undefined {
  let depth = 0
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!
    if (c === '"' || c === "'") return undefined
    if (c === '(' || c === '[' || c === '{' || c === '<') depth += c === '<' ? 0 : 1
    else if (c === ')' || c === ']' || c === '}') depth -= 1
    else if (
      depth === 0 &&
      c === '=' &&
      text[i + 1] !== '=' &&
      text[i + 1] !== '>' &&
      !/[=!<>]/.test(text[i - 1] ?? ' ')
    ) {
      let start = i
      if (/[+\-*/?]/.test(text[i - 1] ?? '')) start = text[i - 2] === '?' ? i - 2 : i - 1
      const op = text.slice(start, i + 1)
      return { target: text.slice(0, start).trim(), op, rhsText: text.slice(i + 1).trim() }
    }
  }
  return undefined
}

export function accepts(type: string, v: Value): boolean {
  const t = type.replace(/\?$/, '')
  if (/^(float|int|double|long|byte|short|uint)$/.test(t))
    return typeof v === 'number' || v === undefined
  if (t === 'bool') return typeof v === 'boolean' || v === undefined
  if (t === 'string' || t === 'Tag')
    return typeof v === 'string' || v instanceof Ref || v === undefined || v === null
  if (/\[\]$|^(List|HashSet|IEnumerable)</.test(t))
    return Array.isArray(v) || v === undefined || v === null
  return typeof v !== 'number' && typeof v !== 'boolean' && typeof v !== 'string'
}

/** Which DLC ids a condition about DlcManager asks for, and whether the whole test is negated. */
export function dlcCondition(
  cond: string,
  evalExpr: (expr: string) => Value,
): { ids: string[]; negated: boolean } | undefined {
  const ids: string[] = []
  const negated = /^\s*!/.test(cond)
  if (/IsExpansion1Active/.test(cond)) ids.push('EXPANSION1_ID')
  for (const m of cond.matchAll(/(?:IsContentSubscribed|IsContentActive|Contains)\(([^)]*)\)/g)) {
    const v = evalExpr(m[1]!)
    if (typeof v === 'string') ids.push(v)
    else if (Array.isArray(v)) ids.push(...v.filter((x): x is string => typeof x === 'string'))
  }
  return ids.length > 0 ? { ids, negated } : undefined
}

/** Operators that need both operands evaluated; `undefined` when they are not known values. */
export function applyBinary(op: string, l: Value, r: Value): Value {
  if (op === '==' || op === '!=') {
    const known = (v: Value) =>
      typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null
    if (!known(l) || !known(r)) return undefined
    return op === '==' ? l === r : l !== r
  }
  if (op === '+' && typeof l === 'string' && (typeof r === 'string' || typeof r === 'number'))
    return l + r
  if (typeof l !== 'number' || typeof r !== 'number') return undefined
  switch (op) {
    case '+':
      return l + r
    case '-':
      return l - r
    case '*':
      return l * r
    case '/':
      return l / r
    case '%':
      return l % r
    case '<':
      return l < r
    case '>':
      return l > r
    case '<=':
      return l <= r
    case '>=':
      return l >= r
  }
  return undefined
}
