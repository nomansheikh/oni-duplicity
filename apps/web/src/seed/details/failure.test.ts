import { describe, expect, it } from 'vite-plus/test'
import { describeFailure } from './failure.ts'

describe('describeFailure', () => {
  it('names the stage, the asteroid and the reason, and suggests another seed', () => {
    const text = describeFailure({
      stage: 'TemplateSpawning',
      world_index: 2,
      message: 'Could not guarantee minCount of Subworld X',
    })
    expect(text).toContain("can't build this seed")
    expect(text).toContain('while template spawning on asteroid 3')
    expect(text).toContain('Could not guarantee minCount of Subworld X')
    expect(text).toContain('try a different one')
  })

  it('says the cluster when the failure belongs to no asteroid', () => {
    expect(
      describeFailure({ stage: 'AssignClusterLocations', world_index: -1, message: 'x' }),
    ).toContain('on the cluster')
  })

  it('still explains itself when the generator gave no detail', () => {
    expect(describeFailure(null)).toContain("can't build this seed")
  })
})
