import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { blockAfter, readStatements, splitArgs } from './csharp.ts'
import type { SkillPerk } from '../../src/skill-tree.ts'
import { lookup, plain } from './strip.ts'

export interface PerkTable {
  /** SkillPerks field name (what Skills.cs refers to) → perk. */
  byField: Map<string, SkillPerk>
}

const dlcIds = (arg: string | undefined) =>
  arg ? [...arg.matchAll(/DlcManager\.(EXPANSION1|DLC\d+)/g)].map((m) => `${m[1]}_ID`) : undefined

/** Numeric constants of TUNING/ROLES.cs and the one lung-capacity bonus the perks use. */
function constants(root: string): Map<string, number> {
  const values = new Map<string, number>()
  const files: [string, string][] = [
    ['TUNING/ROLES.cs', 'ROLES'],
    ['TUNING/DUPLICANTSTATS.cs', 'DUPLICANTSTATS.STANDARD.Breath'],
  ]
  for (const [file, prefix] of files) {
    const text = readFileSync(join(root, file), 'utf8')
    for (const m of text.matchAll(/public (?:static )?(?:int|float) (\w+) = (-?[\d.]+)f?;/g)) {
      values.set(`${prefix}.${m[1]}`, Number(m[2]))
    }
  }
  return values
}

/** Reads every perk of Database/SkillPerks.cs, with the text the game shows for it. */
export function readPerks(root: string, strings: Map<string, string>): PerkTable {
  const source = readFileSync(join(root, 'Database/SkillPerks.cs'), 'utf8')
  const numbers = constants(root)
  const amountOf = (arg: string) => {
    const literal = /^(-?[\d.]+)f$/.exec(arg)
    if (literal) return Number(literal[1])
    const named = /(ROLES\.\w+|DUPLICANTSTATS\.STANDARD\.Breath\.\w+)/.exec(arg)
    const value = named ? numbers.get(named[1]!) : undefined
    if (value === undefined) throw new Error(`Unknown perk amount: ${arg}`)
    return value
  }
  const attributeText = (attribute: string, amount: number) => {
    const name = plain(
      lookup(strings, `STRINGS.DUPLICANTS.ATTRIBUTES.${attribute.toUpperCase()}.NAME`),
    )
    return `+${amount} ${name}`
  }
  const byField = new Map<string, SkillPerk>()
  const body = blockAfter(source, 'public SkillPerks(ResourceSet parent)')
  for (const { text } of readStatements(body)) {
    const m = /^this\.(\w+) = base\.Add\(new (\w+)\(([\s\S]*)\)\)$/.exec(text)
    if (!m) continue
    const [, field, kind, rest] = m
    const args = splitArgs(rest!)
    const id = JSON.parse(args[0]!) as string
    let perk: SkillPerk
    if (kind === 'SimpleSkillPerk') {
      const key = /^UI\.(ROLES_SCREEN\.PERKS\.\w+\.DESCRIPTION)$/.exec(args[1]!)?.[1]
      if (!key) throw new Error(`Unexpected perk text: ${args[1]}`)
      const requiredDlcIds = dlcIds(args[2])
      perk = {
        id,
        text: plain(lookup(strings, `STRINGS.UI.${key}`)),
        ...(requiredDlcIds && { requiredDlcIds }),
      }
    } else if (kind === 'SkillAttributePerk') {
      const attribute = /Attributes\.(\w+)\.Id/.exec(args[1]!)![1]!
      const amount = amountOf(args[2]!)
      perk = { id, text: attributeText(attribute, amount), attribute, amount }
    } else if (kind === 'LungCapacityPerk') {
      // Raises the maximum of the Breath amount (Amounts.Breath.maxAttribute = BreathMax).
      const amount = amountOf(args[1]!)
      perk = { id, text: attributeText('BreathMax', amount), attribute: 'BreathMax', amount }
    } else if (kind === 'ImmunitySkillPerk') {
      const effect = lookup(
        strings,
        `STRINGS.DUPLICANTS.MODIFIERS.${JSON.parse(args[1]!).toUpperCase()}.NAME`,
      )
      const format = lookup(strings, 'STRINGS.UI.ROLES_SCREEN.PERKS.IMMUNITY')
      perk = { id, text: plain(format.replace('{0}', plain(effect))) }
    } else throw new Error(`Unknown perk type ${kind}`)
    byField.set(field!, perk)
  }
  return { byField }
}
