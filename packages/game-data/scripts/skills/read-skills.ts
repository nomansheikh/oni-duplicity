import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ConditionalPerk, SkillCond as Cond, SkillDef } from '../../src/skill-tree.ts'
import { blockAfter, matchBracket, readStatements, splitArgs } from './csharp.ts'
import type { PerkTable } from './read-perks.ts'
import { lookup, plain } from './strip.ts'

/**
 * A perk built under `X and c` plus the same perk under `X and not c` is unconditional on `c`:
 * drop that condition so the pair collapses to one entry.
 */
function mergeOpposites(list: ConditionalPerk[]): ConditionalPerk[] {
  const out = [...list]
  for (let i = 0; i < out.length; i += 1) {
    const j = out.findIndex(
      (o, k) =>
        k > i &&
        o.perk === out[i]!.perk &&
        o.when.length === out[i]!.when.length &&
        o.when.length > 0 &&
        o.when
          .slice(0, -1)
          .every(
            (c, n) => c.dlc === out[i]!.when[n]!.dlc && c.active === out[i]!.when[n]!.active,
          ) &&
        o.when.at(-1)!.dlc === out[i]!.when.at(-1)!.dlc &&
        o.when.at(-1)!.active !== out[i]!.when.at(-1)!.active,
    )
    if (j > i) {
      out[i] = { perk: out[i]!.perk, when: out[i]!.when.slice(0, -1) }
      out.splice(j, 1)
    }
  }
  return out
}

/** SkillGroups field name → group id. */
export function readGroupIds(root: string): Map<string, string> {
  const text = readFileSync(join(root, 'Database/SkillGroups.cs'), 'utf8')
  return new Map(
    [...text.matchAll(/this\.(\w+) = base\.Add\(new SkillGroup\("(\w+)"/g)].map((m) => [
      m[1]!,
      m[2]!,
    ]),
  )
}

/** Tag name of GameTags.Minions.Models.<field>. */
function modelNames(root: string): Map<string, string> {
  const text = readFileSync(join(root, 'GameTags.cs'), 'utf8')
  return new Map(
    [
      ...text.matchAll(
        /public static readonly Tag (\w+) = TagManager\.Create\("(\w+)", DUPLICANTS\.MODEL/g,
      ),
    ].map((m) => [m[1]!, m[2]!]),
  )
}

const dlcIds = (arg: string) =>
  [...arg.matchAll(/DlcManager\.(EXPANSION1|DLC\d+)|"(\w+_ID)"/g)].map((m) => m[2] ?? `${m[1]}_ID`)

/** Reads every skill from the constructor of Database/Skills.cs. */
export function readSkills(
  root: string,
  strings: Map<string, string>,
  perks: PerkTable,
  groupIds: Map<string, string>,
): SkillDef[] {
  const source = readFileSync(join(root, 'Database/Skills.cs'), 'utf8')
  const models = modelNames(root)
  const perkId = (field: string) => {
    const perk = perks.byField.get(field)
    if (!perk) throw new Error(`Unknown perk ${field}`)
    return perk.id
  }
  const variants: SkillDef[] = []
  const idByField = new Map<string, string>()
  const locals = new Map<string, string>()
  const localPerks: ConditionalPerk[] = []
  const text = (arg: string) => plain(lookup(strings, `STRINGS.${locals.get(arg) ?? arg}`))
  for (const { text: stmt, conds } of readStatements(
    blockAfter(source, 'public Skills(ResourceSet parent)'),
  )) {
    const local = /^(?:string|int) (\w+) = ([\s\S]+)$/.exec(stmt)
    if (local) {
      locals.set(local[1]!, local[2]!.trim())
      continue
    }
    const localAdd =
      /^\(?(?!this\.)(\w+)(?: = new List<SkillPerk>\(\))?\)?\.Add\(Db\.Get\(\)\.SkillPerks\.(\w+)\)$/.exec(
        stmt,
      )
    if (localAdd) {
      localPerks.push({ perk: perkId(localAdd[2]!), when: conds })
      continue
    }
    const added = /^this\.(\w+)\.perks\.Add\(Db\.Get\(\)\.SkillPerks\.(\w+)\)$/.exec(stmt)
    if (added) {
      const id = idByField.get(added[1]!)!
      for (const v of variants.filter((x) => x.id === id)) {
        v.conditionalPerks.push({ perk: perkId(added[2]!), when: conds })
      }
      continue
    }
    const deprecated = /^this\.(\w+)\.deprecated = ([\s\S]+)$/.exec(stmt)
    if (deprecated) {
      const extra: Cond[] =
        deprecated[2]!.trim() === 'true' ? [] : [{ dlc: 'EXPANSION1_ID', active: true }]
      if (
        deprecated[2]!.trim() !== 'true' &&
        deprecated[2]!.trim() !== 'DlcManager.IsExpansion1Active()'
      ) {
        throw new Error(`Unknown deprecated rule: ${deprecated[2]}`)
      }
      for (const v of variants.filter((x) => x.id === idByField.get(deprecated[1]!))) {
        v.deprecatedWhen.push([...conds, ...extra])
      }
      continue
    }
    const make = /^this\.(\w+) = this\.AddSkill\(new Skill\(/.exec(stmt)
    if (!make) continue
    const open = stmt.indexOf('(', stmt.indexOf('new Skill'))
    const a = splitArgs(stmt.slice(open + 1, matchBracket(stmt, open))).map(
      (x) => locals.get(x) ?? x,
    )
    const id = JSON.parse(a[0]!) as string
    const perksArg = a[7]!
    const fromList = perksArg.startsWith('new List<SkillPerk>')
    const requiredDlcIds = a[10] === 'null' ? [] : dlcIds(a[10]!)
    const modelField = /Models\.(\w+)\.Name/.exec(a[9]!)?.[1]
    variants.push({
      id,
      name: text(a[1]!),
      description: text(a[2]!),
      tier: Number(a[3]),
      group: groupIds.get(/SkillGroups\.(\w+)\.Id/.exec(a[6]!)![1]!)!,
      hat: JSON.parse(a[4]!) as string,
      model: modelField ? models.get(modelField)! : (JSON.parse(a[9]!) as string),
      prerequisites: [...a[8]!.matchAll(/this\.(\w+)\.Id/g)].map((m) => idByField.get(m[1]!)!),
      perks: fromList ? [...perksArg.matchAll(/SkillPerks\.(\w+)/g)].map((m) => perkId(m[1]!)) : [],
      conditionalPerks: fromList ? [] : mergeOpposites(localPerks.splice(0)),
      requiredDlcIds,
      when: conds,
      deprecatedWhen: [],
    })
    idByField.set(make[1]!, id)
  }
  return variants
}
