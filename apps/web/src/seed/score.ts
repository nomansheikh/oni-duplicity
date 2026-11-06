import type { SeedAsteroid } from './result.ts'
import type { RuleScope, SeedRule } from './rules.ts'

export interface Evaluation {
  /** Every `must` rule matched. */
  passed: boolean
  /** Sum of the weights of the matched `nice` rules. */
  score: number
  /** Sum of all `nice` weights. */
  maxScore: number
  /** Ids of every matched rule. */
  matched: string[]
  /** Ids of the `nice` rules that did not match. */
  missed: string[]
}

function inScope(asteroids: SeedAsteroid[], scope: RuleScope): SeedAsteroid[] {
  switch (scope.kind) {
    case 'start':
      return asteroids.filter((asteroid) => asteroid.isStart)
    case 'asteroid':
      return asteroids.filter((asteroid) => asteroid.id === scope.asteroid)
    case 'anywhere':
      return asteroids
  }
}

export function ruleMatches(rule: SeedRule, asteroids: SeedAsteroid[]): boolean {
  switch (rule.kind) {
    case 'asteroid':
      return asteroids.some((asteroid) => asteroid.id === rule.asteroid)
    case 'trait': {
      const found = inScope(asteroids, rule.scope).some((asteroid) =>
        asteroid.traits.includes(rule.trait),
      )
      return rule.presence === 'has' ? found : !found
    }
    case 'geyser': {
      let count = 0
      for (const asteroid of inScope(asteroids, rule.scope)) {
        for (const geyser of asteroid.geysers) if (geyser.type === rule.geyser) count++
      }
      return count >= rule.min && (rule.max === undefined || count <= rule.max)
    }
  }
}

/**
 * Checks `rules` against a cluster. Must-rules filter (`passed`), nice-rules add their weight.
 * Stops early at the first failed must-rule, so `score`, `matched` and `missed` are only complete
 * when `passed` is true.
 */
export function evaluate(rules: SeedRule[], asteroids: SeedAsteroid[]): Evaluation {
  const evaluation: Evaluation = { passed: true, score: 0, maxScore: 0, matched: [], missed: [] }
  for (const rule of rules) {
    if (rule.mode === 'nice') evaluation.maxScore += rule.weight
  }
  for (const rule of rules) {
    const hit = ruleMatches(rule, asteroids)
    if (rule.mode === 'must' && !hit) return { ...evaluation, passed: false }
    if (hit) {
      evaluation.matched.push(rule.id)
      if (rule.mode === 'nice') evaluation.score += rule.weight
    } else {
      evaluation.missed.push(rule.id)
    }
  }
  return evaluation
}
