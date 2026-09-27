/**
 * Generates src/generated/game-data.json from a local Oxygen Not Included install:
 * - English names and descriptions from StreamingAssets/strings/strings_template.pot
 * - exact IDs (e.g. "BingeEater") recovered from string literals in Managed/Assembly-CSharp.dll,
 *   because the strings file only has upper-cased keys (STRINGS.DUPLICANTS.TRAITS.BINGEEATER).
 *
 * Usage: vp run extract-game-data   (set ONI_PATH to the game folder if it isn't the Steam default)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_PATHS = [
  join(
    homedir(),
    'Library/Application Support/Steam/steamapps/common/OxygenNotIncluded/OxygenNotIncluded.app/Contents/Resources/Data',
  ),
  'C:/Program Files (x86)/Steam/steamapps/common/OxygenNotIncluded/OxygenNotIncluded_Data',
  join(homedir(), '.steam/steam/steamapps/common/OxygenNotIncluded/OxygenNotIncluded_Data'),
]

function dataDir(): string {
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

/** msgctxt → msgid from a gettext template. */
function readPot(path: string): Map<string, string> {
  const unquote = (s: string) => JSON.parse(s) as string
  const entries = new Map<string, string>()
  let ctxt: string | null = null
  let target: 'ctxt' | 'id' | null = null
  let id = ''
  const flush = () => {
    if (ctxt !== null) entries.set(ctxt, id)
    ctxt = null
    id = ''
  }
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.startsWith('msgctxt ')) {
      flush()
      ctxt = unquote(line.slice(8))
      target = 'ctxt'
    } else if (line.startsWith('msgid ')) {
      id = unquote(line.slice(6))
      target = 'id'
    } else if (line.startsWith('"') && target === 'id') {
      id += unquote(line)
    } else if (line.startsWith('msgstr')) {
      target = null
    }
  }
  flush()
  return entries
}

/** Upper-cased identifier → identifiers found as UTF-16 string literals in the assembly. */
function readAssemblyLiterals(path: string): Map<string, string[]> {
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

const clean = (text: string) => text.replace(/<[^>]+>/g, '').trim()

const sdbmLower = (s: string) => {
  let h = 0
  for (const ch of s.toLowerCase()) h = (ch.charCodeAt(0) + (h << 6) + (h << 16) - h) | 0
  return h
}

interface Entry {
  id: string
  name: string
  desc?: string
}

function collect(
  strings: Map<string, string>,
  literals: Map<string, string[]>,
  prefix: string,
  { exactId = false }: { exactId?: boolean } = {},
): Entry[] {
  const entries: Entry[] = []
  const re = new RegExp(`^${prefix.replace(/\./g, '\\.')}([A-Z0-9_]+)\\.NAME$`)
  for (const [key, name] of strings) {
    const match = re.exec(key)
    if (!match) continue
    const upper = match[1]!
    const candidates = literals.get(upper) ?? []
    // Prefer a mixed-case literal (the real ID) over an all-caps constant.
    const id = exactId ? upper : (candidates.find((c) => c !== upper) ?? candidates[0])
    if (!id) continue
    const desc =
      strings.get(`${prefix}${upper}.DESC`) ?? strings.get(`${prefix}${upper}.DESCRIPTION`)
    entries.push({ id, name: clean(name), ...(desc ? { desc: clean(desc) } : {}) })
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

const dir = dataDir()
const strings = readPot(join(dir, 'StreamingAssets/strings/strings_template.pot'))
const literals = readAssemblyLiterals(join(dir, 'Managed/Assembly-CSharp.dll'))

interface ElementEntry extends Entry {
  hash: number
  state: string
  dlcId?: string
}

/** Elements (SimHashes) from StreamingAssets/elements/*.yaml; names from STRINGS.ELEMENTS. */
function readElements(strings: Map<string, string>): ElementEntry[] {
  const elements: ElementEntry[] = []
  for (const file of ['solid', 'liquid', 'gas', 'special']) {
    const text = readFileSync(join(dir, `StreamingAssets/elements/${file}.yaml`), 'utf8')
    for (const block of text.split(/\n  - elementId: /).slice(1)) {
      const id = block.split(/[\s#]/)[0]!
      const field = (key: string) =>
        new RegExp(`\\n\\s+${key}:\\s*"?([^"\\n#]*)"?`).exec(block)?.[1]?.trim()
      const state = field('state') ?? 'Solid'
      const dlcId = field('dlcId')
      const name = strings.get(`STRINGS.ELEMENTS.${id.toUpperCase()}.NAME`)
      elements.push({
        id,
        name: clean(name ?? id),
        hash: sdbmLower(id),
        state,
        ...(dlcId ? { dlcId } : {}),
      })
    }
  }
  return elements.sort((a, b) => a.name.localeCompare(b.name))
}

interface CritterEntry extends Entry {
  /** Species family, e.g. PACU for Pacu, Tropical Pacu and their fry. */
  family: string
  baby: boolean
}

/** Critters keyed by prefab ID (upper-cased), taken from the <link> in each species name. */
function readCritters(strings: Map<string, string>): CritterEntry[] {
  const critters = new Map<string, CritterEntry>()
  for (const [key, value] of strings) {
    const match = /^STRINGS\.CREATURES\.SPECIES\.([A-Z0-9_]+)\.(?:[A-Z0-9_]+\.)*NAME$/.exec(key)
    if (!match || match[1] === 'GEYSER') continue
    const link = /<link="([A-Z0-9_]+)">/.exec(value)?.[1]
    if (!link) continue
    const baby = key.includes('.BABY.')
    const id = baby ? `${link}BABY` : link
    if (!critters.has(id)) {
      critters.set(id, { id, name: clean(value), family: match[1]!, baby })
    }
  }
  return [...critters.values()].sort((a, b) => a.name.localeCompare(b.name))
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

function literalFor(upperKey: string): string | undefined {
  const wanted = normalize(upperKey)
  const candidates: string[] = []
  for (const [key, list] of literals) if (normalize(key) === wanted) candidates.push(...list)
  return candidates.sort((a, b) => rank(a) - rank(b))[0]
}

/** Settings whose string key differs from the ID stored in saves. */
const SETTING_ALIASES: Record<string, string> = { BIONICPOWERUSE: 'BionicWattage' }

interface SettingEntry extends Entry {
  levels: Entry[]
}

/** Custom game settings (difficulty) and their levels from the new-game screen strings. */
function readGameSettings(strings: Map<string, string>): SettingEntry[] {
  const prefix = 'STRINGS.UI.FRONTEND.CUSTOMGAMESETTINGSSCREEN.SETTINGS.'
  const settings = new Map<string, SettingEntry>()
  for (const [key, value] of strings) {
    const setting = new RegExp(`^${prefix.replace(/\./g, '\\.')}([A-Z0-9_]+)\\.NAME$`).exec(key)
    if (setting) {
      const upper = setting[1]!
      const tooltip = strings.get(`${prefix}${upper}.TOOLTIP`)
      settings.set(upper, {
        id: SETTING_ALIASES[upper] ?? literalFor(upper) ?? upper,
        name: clean(value),
        ...(tooltip ? { desc: clean(tooltip) } : {}),
        levels: [],
      })
    }
  }
  for (const [key, value] of strings) {
    const level = new RegExp(
      `^${prefix.replace(/\./g, '\\.')}([A-Z0-9_]+)\\.LEVELS\\.([A-Z0-9_]+)\\.NAME$`,
    ).exec(key)
    const entry = level && settings.get(level[1]!)
    if (!level || !entry) continue
    const tooltip = strings.get(`${prefix}${level[1]}.LEVELS.${level[2]}.TOOLTIP`)
    entry.levels.push({
      id: literalFor(level[2]!) ?? level[2]!,
      name: clean(value),
      ...(tooltip ? { desc: clean(tooltip) } : {}),
    })
  }
  return [...settings.values()].filter((s) => s.levels.length > 0)
}

const data = {
  source:
    "Generated by packages/game-data/scripts/extract-game-data.ts from the game's strings and assembly.",
  traits: collect(strings, literals, 'STRINGS.DUPLICANTS.TRAITS.'),
  attributes: collect(strings, literals, 'STRINGS.DUPLICANTS.ATTRIBUTES.'),
  skillGroups: collect(strings, literals, 'STRINGS.DUPLICANTS.SKILLGROUPS.').map((g) => ({
    ...g,
    hash: sdbmLower(g.id),
  })),
  amounts: collect(strings, literals, 'STRINGS.DUPLICANTS.STATS.'),
  effects: collect(strings, literals, 'STRINGS.DUPLICANTS.MODIFIERS.'),
  personalities: collect(strings, literals, 'STRINGS.DUPLICANTS.PERSONALITIES.', { exactId: true }),
  geysers: collect(strings, literals, 'STRINGS.CREATURES.SPECIES.GEYSER.', { exactId: true }),
  elements: readElements(strings),
  critters: readCritters(strings),
  techs: collect(strings, literals, 'STRINGS.RESEARCH.TECHS.'),
  gameSettings: readGameSettings(strings),
}

const out = new URL('../src/generated/game-data.json', import.meta.url)
writeFileSync(out, `${JSON.stringify(data, null, 1)}\n`)
for (const [k, v] of Object.entries(data)) if (Array.isArray(v)) console.log(`${k}: ${v.length}`)
