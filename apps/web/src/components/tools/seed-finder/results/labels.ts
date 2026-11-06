import { findWorldgenTrait, findWorldgenWorld } from '@oni-duplicity/game-data'
import { geyserName } from '@/lib/seed-draw/geyser-marks'
import type { SeedRule, RuleScope } from '@/seed/rules'

/** The game's name for a trait id such as `expansion1::traits/GeoActive`. */
export function traitName(id: string): string {
  return findWorldgenTrait(id)?.name ?? id
}

/** The game's name for a world path (`expansion1::worlds/WaterMoonlet`) or bare id. */
export function asteroidLabel(id: string): string {
  return findWorldgenWorld(id)?.name ?? id
}

function scopeLabel(scope: RuleScope): string {
  if (scope.kind === 'start') return 'on the start asteroid'
  if (scope.kind === 'anywhere') return 'anywhere'
  return `on ${asteroidLabel(scope.asteroid)}`
}

/** A one-line description of a rule, for the matched and missed lists. */
export function ruleLabel(rule: SeedRule): string {
  switch (rule.kind) {
    case 'geyser': {
      const name = geyserName(rule.geyser)
      const count =
        rule.max === undefined
          ? `${rule.min}+`
          : rule.max === rule.min
            ? `${rule.min}`
            : `${rule.min}-${rule.max}`
      return `${count} ${name} ${scopeLabel(rule.scope)}`
    }
    case 'trait':
      return `${rule.presence === 'has' ? 'Has' : 'Lacks'} ${traitName(rule.trait)} ${scopeLabel(rule.scope)}`
    case 'asteroid':
      return `Contains ${asteroidLabel(rule.asteroid)}`
  }
}

export function mapsLink(coordinate: string): string {
  return `https://mapsnotincluded.org/map-explorer/${encodeURIComponent(coordinate)}`
}
