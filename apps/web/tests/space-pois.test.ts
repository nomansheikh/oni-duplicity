import { readFileSync } from 'node:fs'
import { hashString } from '@oni-duplicity/game-data'
import { parseSave, type SaveGame } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { artifactPoiTypes, harvestablePoiTypes } from '../src/lib/space-pois.ts'
import { listPois, readArtifactState, readHarvestState } from '../src/worker/pois.ts'
import { fixtures, galaxy } from './helpers.ts'

const isPoi = (name: string) => /^(Harvestable|Artifact)SpacePOI_/.test(name)

/** The POI objects the save holds, whatever the parser made of them. */
function poiObjects(save: SaveGame) {
  return save.gameObjects.filter((g) => isPoi(g.name)).flatMap((g) => g.gameObjects)
}

test('the transcribed POI types have unique ids and hashes', () => {
  const harvestable = harvestablePoiTypes.map((t) => t.id)
  const artifact = artifactPoiTypes.map((t) => t.id)
  expect(new Set(harvestable).size).toBe(harvestable.length)
  expect(new Set([...harvestable, ...artifact].map(hashString)).size).toBe(
    harvestable.length + artifact.length,
  )
  for (const type of harvestablePoiTypes) {
    expect(type.capacity.min, type.id).toBeLessThanOrEqual(type.capacity.max)
    expect(type.recharge.min, type.id).toBeLessThanOrEqual(type.recharge.max)
    expect(type.elements.length, type.id).toBeGreaterThan(0)
  }
})

// Every fixture POI must be read in full: a type the table does not know, or a layout the reader
// does not recognise, shows up here instead of as an empty cell in the app.
test('every POI in every fixture is read with plausible values', () => {
  let total = 0
  for (const path of fixtures) {
    const save = parseSave(readFileSync(path))
    const objects = poiObjects(save)
    const pois = listPois(save)
    const label = path.split('/').pop()
    expect(pois.length, label).toBe(objects.length)
    total += pois.length

    for (const poi of pois) {
      const where = `${label} ${poi.id}`
      expect(Number.isInteger(poi.location.r) && Number.isInteger(poi.location.q), where).toBe(true)
      expect(poi.reveal, where).toBeDefined()
      if (poi.kind === 'harvestable') {
        expect(poi.harvest, where).toBeDefined()
        const { current, max, elements } = poi.harvest!
        expect(current, where).toBeGreaterThanOrEqual(0)
        expect(current, where).toBeLessThanOrEqual(max + 1)
        expect(
          elements.reduce((n, e) => n + e.share, 0),
          where,
        ).toBeCloseTo(1, 6)
      } else {
        expect(poi.harvest, where).toBeUndefined()
      }
      expect(poi.artifact, where).toBeDefined()
      expect(poi.artifact!.charge, where).toBeGreaterThanOrEqual(0)
      expect(poi.artifact!.charge, where).toBeLessThanOrEqual(1)
      expect(poi.artifact!.harvests, where).toBeGreaterThanOrEqual(0)
      expect(poi.artifact!.harvests, where).toBeLessThan(10_000)
    }

    // The rolls are fractions of the type's range.
    for (const obj of objects) {
      const bytes = obj.behaviors.find((b) => b.name === 'StateMachineController')!.extraRaw
      const harvest = readHarvestState(bytes)
      if (harvest) {
        expect(harvest.capacityRoll).toBeGreaterThanOrEqual(0)
        expect(harvest.capacityRoll).toBeLessThanOrEqual(1)
        expect(harvest.rechargeRoll).toBeGreaterThanOrEqual(0)
        expect(harvest.rechargeRoll).toBeLessThanOrEqual(1)
      }
      const artifact = readArtifactState(bytes)
      if (artifact) {
        expect(artifact.rechargeRoll).toBeGreaterThanOrEqual(0)
        expect(artifact.rechargeRoll).toBeLessThanOrEqual(1)
      }
    }
  }
  // Both Spaced Out fixtures that are always present contribute POIs.
  expect(total).toBeGreaterThan(0)
}, 300_000)

test('the galaxy fixture lists its POIs with locations, stock and artifacts', () => {
  const save = parseSave(readFileSync(galaxy))
  const pois = listPois(save)
  const harvestable = pois.filter((p) => p.kind === 'harvestable')
  const artifact = pois.filter((p) => p.kind === 'artifact')
  expect(harvestable.length).toBeGreaterThan(20)
  expect(artifact.length).toBeGreaterThan(0)
  // Harvestable POIs come first, then artifact sites.
  expect(pois.slice(0, harvestable.length).every((p) => p.kind === 'harvestable')).toBe(true)
  expect(new Set(pois.map((p) => p.id)).size).toBe(pois.length)
  // This build keeps a spawned artifact on the starmap tile, so waiting ones are listed.
  expect(pois.some((p) => p.artifact?.waiting?.startsWith('artifact_'))).toBe(true)
  // The colony has explored almost nothing yet.
  expect(pois.filter((p) => p.reveal === 'hidden').length).toBeGreaterThan(pois.length / 2)
})

test('reading POIs does not change the save', () => {
  const save = parseSave(readFileSync(galaxy))
  const before = JSON.stringify(poiObjects(save), (_, v) =>
    v instanceof Uint8Array ? Array.from(v) : v,
  )
  listPois(save)
  const after = JSON.stringify(poiObjects(save), (_, v) =>
    v instanceof Uint8Array ? Array.from(v) : v,
  )
  expect(after).toBe(before)
})
