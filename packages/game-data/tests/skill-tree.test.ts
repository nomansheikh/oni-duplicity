import { describe, expect, it } from 'vite-plus/test'
import { skillTree } from '../src/index.ts'

const perkIds = new Set(skillTree.perks.map((p) => p.id))
const groupIds = new Set(skillTree.groups.map((g) => g.id))
const skillIds = new Set(skillTree.skills.map((s) => s.id))

describe('skillTree', () => {
  it('only refers to perks, groups and skills that exist', () => {
    for (const s of skillTree.skills) {
      expect(groupIds.has(s.group), s.id).toBe(true)
      for (const p of [...s.perks, ...s.conditionalPerks.map((c) => c.perk)]) {
        expect(perkIds.has(p), `${s.id}: ${p}`).toBe(true)
      }
      for (const r of s.prerequisites) expect(skillIds.has(r), `${s.id}: ${r}`).toBe(true)
    }
  })

  it('has a morale cost for every tier', () => {
    const tiers = skillTree.skills.map((s) => s.tier)
    expect(skillTree.tuning.moraleCostByTier.length).toBeGreaterThan(Math.max(...tiers))
  })

  it('keeps the variants the game builds differently with Spaced Out', () => {
    const thermal = skillTree.skills.filter((s) => s.id === 'ThermalSuits')
    expect(thermal.map((s) => s.prerequisites).sort((a, b) => a.length - b.length)).toEqual([
      ['Hauling1'],
      ['Hauling1', 'RocketPiloting1'],
    ])
  })

  it('reads the experience curve', () => {
    expect(skillTree.tuning).toMatchObject({
      targetSkillsEarned: 15,
      targetSkillsCycle: 250,
      experienceLevelPower: 1.44,
      secondsPerCycle: 600,
    })
  })
})
