import { expect } from 'vite-plus/test'
import { applyEdit, listDestinations, type Edit } from '../src/worker/model.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { changedPaths, roundTrip, sameBytes } from './helpers.ts'
import { base, body, destinationTest, load } from './space-edits-helpers.ts'

destinationTest(
  'destination mass is clamped to the type and only that field changes',
  () => {
    const save = load(base!)
    const before = roundTrip(save)
    const rock = listDestinations(save).find((d) => d.mass)!
    expect(rock.mass!.capacity).toBeGreaterThan(0)

    const target = Math.round(rock.mass!.capacity / 3)
    applyEdit(save, { type: 'setDestinationMass', destination: rock.id, mass: target })
    expect(listDestinations(save).find((d) => d.id === rock.id)!.mass!.current).toBe(target)
    applyEdit(save, { type: 'setDestinationMass', destination: rock.id, mass: 1e12 })
    expect(listDestinations(save).find((d) => d.id === rock.id)!.mass!.current).toBe(
      rock.mass!.capacity,
    )
    applyEdit(save, { type: 'setDestinationMass', destination: rock.id, mass: -5 })
    expect(listDestinations(save).find((d) => d.id === rock.id)!.mass!.current).toBe(0)

    applyEdit(save, { type: 'setDestinationMass', destination: rock.id, mass: target })
    const changed = changedPaths(before, roundTrip(save))
    expect(changed).toHaveLength(1)
    expect(changed[0]).toMatch(/\.templateData\.destinations\.\d+\.availableMass$/)
  },
  120_000,
)

destinationTest(
  'destination mass refuses what it cannot set',
  () => {
    const save = load(base!)
    const destinations = listDestinations(save)
    const none = destinations.find((d) => !d.mass)
    expect(none, 'a destination with nothing to recover').toBeDefined()
    expect(() =>
      applyEdit(save, { type: 'setDestinationMass', destination: none!.id, mass: 10 }),
    ).toThrow()
    expect(() =>
      applyEdit(save, { type: 'setDestinationMass', destination: -99, mass: 10 }),
    ).toThrow()
    expect(() =>
      applyEdit(save, { type: 'setDestinationMass', destination: destinations[0]!.id, mass: NaN }),
    ).toThrow()
  },
  120_000,
)

destinationTest(
  'destination analysis sets the score and clears the scan target',
  () => {
    const save = load(base!)
    const hidden = listDestinations(save).filter((d) => d.analysis === 'hidden')
    expect(hidden.length).toBeGreaterThan(1)
    const [first, second] = hidden as [(typeof hidden)[number], (typeof hidden)[number]]
    const before = roundTrip(save)

    applyEdit(save, { type: 'setDestinationAnalysis', destination: first.id, level: 'discovered' })
    let view = listDestinations(save).find((d) => d.id === first.id)!
    expect(view.analysis).toBe('discovered')
    expect(view.score).toBe(50)

    applyEdit(save, { type: 'setDestinationAnalysis', destination: first.id, level: 'complete' })
    view = listDestinations(save).find((d) => d.id === first.id)!
    expect(view.analysis).toBe('complete')
    expect(view.score).toBe(100)
    // Completing again leaves a complete score alone.
    applyEdit(save, { type: 'setDestinationAnalysis', destination: first.id, level: 'complete' })
    expect(listDestinations(save).find((d) => d.id === first.id)!.score).toBe(100)

    // Only the destination being scanned has its target cleared.
    const manager = save.gameObjects
      .find((g) => g.name === 'SaveGame')!
      .gameObjects[0]!.behaviors.find((b) => b.name === 'SpacecraftManager')!.templateData!
    manager.analyzeDestinationID = second.id
    applyEdit(save, { type: 'setDestinationAnalysis', destination: first.id, level: 'complete' })
    expect(manager.analyzeDestinationID).toBe(second.id)
    applyEdit(save, { type: 'setDestinationAnalysis', destination: second.id, level: 'complete' })
    expect(manager.analyzeDestinationID).toBe(-1)

    const changed = changedPaths(before, roundTrip(save))
    expect(
      changed.filter(
        (p) => !/\.templateData\.(destinationAnalysisScores(\.|$)|analyzeDestinationID$)/.test(p),
      ),
    ).toEqual([])
  },
  120_000,
)

destinationTest(
  'undo restores every destination edit byte for byte',
  () => {
    const save = load(base!)
    const before = body(save)
    const hidden = listDestinations(save).find((d) => d.analysis === 'hidden')!
    const withMass = listDestinations(save).find((d) => d.mass)!
    const edits: Edit[] = [
      { type: 'setDestinationMass', destination: withMass.id, mass: 123 },
      { type: 'setDestinationAnalysis', destination: hidden.id, level: 'discovered' },
      { type: 'setDestinationAnalysis', destination: hidden.id, level: 'complete' },
    ]
    const undo = edits.map((edit) => applyWithRestore(save, edit))
    expect(sameBytes(body(save), before)).toBe(false)
    for (const restore of undo.toReversed()) restore()
    expect(sameBytes(body(save), before)).toBe(true)
  },
  120_000,
)

destinationTest(
  'no destination carries a startAnalyzed flag in a save',
  () => {
    // `SpaceDestination.startAnalyzed` is not serialized, so a save cannot mark a destination as
    // analyzed from the start; the analysis state comes from the score alone.
    const manager = load(base!)
      .gameObjects.find((g) => g.name === 'SaveGame')!
      .gameObjects[0]!.behaviors.find((b) => b.name === 'SpacecraftManager')!.templateData!
    for (const d of manager.destinations as Record<string, unknown>[]) {
      expect('startAnalyzed' in d).toBe(false)
    }
  },
  120_000,
)
