import { clean, type Entry } from './collect.ts'
import { literalFor } from './assembly.ts'

/** Settings whose string key differs from the ID stored in saves. */
const SETTING_ALIASES: Record<string, string> = { BIONICPOWERUSE: 'BionicWattage' }

export interface SettingEntry extends Entry {
  levels: Entry[]
}

/** Custom game settings (difficulty) and their levels from the new-game screen strings. */
export function readGameSettings(
  strings: Map<string, string>,
  literals: Map<string, string[]>,
): SettingEntry[] {
  const prefix = 'STRINGS.UI.FRONTEND.CUSTOMGAMESETTINGSSCREEN.SETTINGS.'
  const settings = new Map<string, SettingEntry>()
  for (const [key, value] of strings) {
    const setting = new RegExp(`^${prefix.replace(/\./g, '\\.')}([A-Z0-9_]+)\\.NAME$`).exec(key)
    if (setting) {
      const upper = setting[1]!
      const tooltip = strings.get(`${prefix}${upper}.TOOLTIP`)
      settings.set(upper, {
        id: SETTING_ALIASES[upper] ?? literalFor(literals, upper) ?? upper,
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
      id: literalFor(literals, level[2]!) ?? level[2]!,
      name: clean(value),
      ...(tooltip ? { desc: clean(tooltip) } : {}),
    })
  }
  return [...settings.values()].filter((s) => s.levels.length > 0)
}
