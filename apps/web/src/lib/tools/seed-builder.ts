import type {
  AsteroidRule,
  GeyserRule,
  RuleScope,
  SeedPreset,
  SeedRule,
  TraitRule,
} from '@/seed/rules'
import type { MixingLevels } from '@/seed/mixing'

export { parseState } from './seed-builder-parse'

/**
 * What the rule builder edits: the cluster, its mixing and the rule list. Plain data, kept in the
 * browser.
 */
export interface BuilderState {
  /** Coordinate prefix of the chosen cluster, e.g. `SNDST-A`. */
  cluster: string
  /** The Mixing tab: DLC content toggles and asteroid and biome remixes. */
  mixing: MixingLevels
  /** The preset the rows started from, shown in the picker until the user stops matching it. */
  presetId: string | null
  rules: SeedRule[]
}

export type RuleKind = SeedRule['kind']

export const DEFAULT_WEIGHT = 1

export function emptyState(cluster: string): BuilderState {
  return { cluster, mixing: {}, presetId: null, rules: [] }
}

export function nextRuleId(rules: SeedRule[]): string {
  const taken = new Set(rules.map((rule) => rule.id))
  let n = rules.length + 1
  while (taken.has(`rule-${n}`)) n++
  return `rule-${n}`
}

/** A blank rule of one kind. Its target is empty until the user picks one. */
export function blankRule(kind: RuleKind, id: string): SeedRule {
  const base = { id, mode: 'must', weight: DEFAULT_WEIGHT } as const
  switch (kind) {
    case 'geyser':
      return { ...base, kind, geyser: '', scope: { kind: 'anywhere' }, min: 1 }
    case 'trait':
      return { ...base, kind, trait: '', presence: 'has', scope: { kind: 'anywhere' } }
    case 'asteroid':
      return { ...base, kind, asteroid: '' }
  }
}

export function addRule(state: BuilderState, kind: RuleKind = 'geyser'): BuilderState {
  return { ...state, rules: [...state.rules, blankRule(kind, nextRuleId(state.rules))] }
}

export function removeRule(state: BuilderState, id: string): BuilderState {
  return { ...state, rules: state.rules.filter((rule) => rule.id !== id) }
}

/** Changes a rule's kind. The mode and weight stay; the target and condition start over. */
export function changeKind(state: BuilderState, id: string, kind: RuleKind): BuilderState {
  return {
    ...state,
    rules: state.rules.map((rule) =>
      rule.id === id && rule.kind !== kind
        ? { ...blankRule(kind, id), mode: rule.mode, weight: rule.weight }
        : rule,
    ),
  }
}

export type RulePatch = Partial<Omit<GeyserRule, 'id' | 'kind'>> &
  Partial<Omit<TraitRule, 'id' | 'kind'>> &
  Partial<Omit<AsteroidRule, 'id' | 'kind'>>

/** Applies fields to one rule. Fields the rule's kind does not have are ignored. */
export function patchRule(state: BuilderState, id: string, patch: RulePatch): BuilderState {
  return {
    ...state,
    rules: state.rules.map((rule) => {
      if (rule.id !== id) return rule
      const next = { ...rule } as Record<string, unknown>
      for (const [key, value] of Object.entries(patch)) {
        // `max` is optional, so it may be absent on a geyser rule yet still settable.
        if (key in rule || (key === 'max' && rule.kind === 'geyser')) next[key] = value
      }
      if (typeof next.weight === 'number') next.weight = clampWeight(next.weight)
      return next as unknown as SeedRule
    }),
  }
}

export function clampWeight(weight: number): number {
  return Number.isFinite(weight) ? Math.min(99, Math.max(1, Math.round(weight))) : DEFAULT_WEIGHT
}

/** Replaces the rows with a copy of the preset's rules. */
export function applyPreset(state: BuilderState, preset: SeedPreset): BuilderState {
  return { ...state, presetId: preset.id, rules: preset.rules.map((rule) => structuredClone(rule)) }
}

function scopeFits(scope: RuleScope, asteroids: ReadonlySet<string>): RuleScope {
  return scope.kind === 'asteroid' && !asteroids.has(scope.asteroid) ? { kind: 'anywhere' } : scope
}

/**
 * Switches cluster. A rule that names an asteroid the new cluster lacks falls back to `anywhere`
 * (or loses its asteroid, for an asteroid rule), so nothing silently never matches.
 */
export function changeCluster(
  state: BuilderState,
  cluster: string,
  asteroidIds: string[],
): BuilderState {
  const asteroids = new Set(asteroidIds)
  return {
    ...state,
    cluster,
    rules: state.rules.map((rule) => {
      if (rule.kind === 'asteroid') {
        return asteroids.has(rule.asteroid) ? rule : { ...rule, asteroid: '' }
      }
      return { ...rule, scope: scopeFits(rule.scope, asteroids) }
    }),
  }
}

export function isComplete(rule: SeedRule): boolean {
  switch (rule.kind) {
    case 'geyser':
      return rule.geyser !== ''
    case 'trait':
      return rule.trait !== ''
    case 'asteroid':
      return rule.asteroid !== ''
  }
}

/** The rules a search can run: the ones with a target. */
export function runnableRules(state: BuilderState): SeedRule[] {
  return state.rules.filter(isComplete)
}

/** Names the first problem that stops a search, or null when it can run. */
export function blocker(state: BuilderState): string | null {
  if (state.rules.length === 0) return 'Add a rule or pick a preset first.'
  if (runnableRules(state).length === 0) return 'Pick a target for at least one rule.'
  return null
}

/** A trait id without its DLC folder: `expansion1::traits/Volcanoes` gives `traits/Volcanoes`. */
const traitPath = (id: string) => id.replace(/^\w+::/, '')

/**
 * Makes the rules fit the DLCs in play: a trait id they do not report is swapped for its twin from
 * another DLC folder (`traits/Volcanoes`, `expansion1::traits/Volcanoes`) when that exists, and a
 * rule on a geyser or trait they lack is dropped.
 */
export function fitToDlcs(
  state: BuilderState,
  available: { traits: ReadonlySet<string>; geysers: ReadonlySet<string> },
): BuilderState {
  const rules: SeedRule[] = []
  for (const rule of state.rules) {
    if (rule.kind === 'geyser') {
      if (rule.geyser === '' || available.geysers.has(rule.geyser)) rules.push(rule)
    } else if (rule.kind === 'trait') {
      const id =
        rule.trait === '' || available.traits.has(rule.trait)
          ? rule.trait
          : [...available.traits].find((trait) => traitPath(trait) === traitPath(rule.trait))
      if (id !== undefined) rules.push({ ...rule, trait: id })
    } else {
      rules.push(rule)
    }
  }
  return { ...state, rules }
}
