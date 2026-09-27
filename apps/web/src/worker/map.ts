import { findElementByHash, findGeyser } from '@oni-duplicity/game-data'
import { readSimGrid, type SaveGame, type SimGrid } from '@oni-duplicity/save-parser'

export interface MapElement {
  id: string
  name: string
  state: string
  cells: number
  /** Kilograms across the world. */
  mass: number
}

export interface MapMarker {
  kind: 'duplicant' | 'geyser' | 'critter'
  name: string
  /** World cell, from the bottom-left. */
  x: number
  y: number
}

/** One asteroid's cells, row by row from the bottom. */
export interface WorldMap {
  width: number
  height: number
  elements: MapElement[]
  /** Index into `elements` per cell. */
  cells: Uint16Array
  temperature: Float32Array
  mass: Float32Array
  markers: MapMarker[]
}

// The sim data never changes while editing, so decode it once per loaded save.
const grids = new WeakMap<SaveGame, SimGrid>()

function gridOf(save: SaveGame): SimGrid {
  let grid = grids.get(save)
  if (!grid) {
    grid = readSimGrid(save.simData)
    grids.set(save, grid)
  }
  return grid
}

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

function boundsOf(save: SaveGame, grid: SimGrid, worldId: string): Bounds {
  const [prefab, index] = [worldId.slice(0, worldId.lastIndexOf(':')), worldId.split(':').pop()]
  const obj = save.gameObjects.find((g) => g.name === prefab)?.gameObjects[Number(index)]
  const world = obj?.behaviors.find((b) => b.name === 'WorldContainer')?.templateData as
    | { worldOffset?: { x: number; y: number }; worldSize?: { x: number; y: number } }
    | undefined
  if (world?.worldOffset && world.worldSize) {
    return {
      x: world.worldOffset.x,
      y: world.worldOffset.y,
      width: world.worldSize.x,
      height: world.worldSize.y,
    }
  }
  // Saves without world containers: the whole grid inside its border.
  return { x: 0, y: 0, width: grid.width - 2, height: grid.height - 2 }
}

function nameOf(obj: SaveGame['gameObjects'][number]['gameObjects'][number]): string | undefined {
  for (const b of obj.behaviors) {
    const name = b.name === 'MinionIdentity' ? b.templateData?.name : undefined
    if (typeof name === 'string') return name
    const saved = b.name === 'UserNameable' ? b.templateData?.savedName : undefined
    if (typeof saved === 'string' && saved) return saved
  }
  return undefined
}

function markersIn(save: SaveGame, bounds: Bounds): MapMarker[] {
  const markers: MapMarker[] = []
  for (const group of save.gameObjects) {
    for (const obj of group.gameObjects) {
      const kind = obj.behaviors.some((b) => b.name === 'MinionIdentity')
        ? 'duplicant'
        : obj.behaviors.some((b) => b.name === 'Geyser')
          ? 'geyser'
          : obj.behaviors.some((b) => b.name === 'CreatureBrain')
            ? 'critter'
            : null
      if (!kind) continue
      const x = Math.floor(obj.position.x) - bounds.x
      const y = Math.floor(obj.position.y) - bounds.y
      if (x < 0 || y < 0 || x >= bounds.width || y >= bounds.height) continue
      const name =
        nameOf(obj) ?? (kind === 'geyser' ? findGeyser(group.name)?.name : undefined) ?? group.name
      markers.push({ kind, name, x, y })
    }
  }
  return markers
}

export function worldMap(save: SaveGame, worldId: string): WorldMap {
  const grid = gridOf(save)
  const bounds = boundsOf(save, grid, worldId)
  const count = bounds.width * bounds.height
  const cells = new Uint16Array(count)
  const temperature = new Float32Array(count)
  const mass = new Float32Array(count)
  const elements: MapElement[] = []
  const indexByHash = new Map<number, number>()

  for (let y = 0; y < bounds.height; y++) {
    // Game cell (x, y) is grid cell (x + 1, y + 1).
    const row = (bounds.y + y + 1) * grid.width + bounds.x + 1
    for (let x = 0; x < bounds.width; x++) {
      const from = row + x
      const to = y * bounds.width + x
      const hash = grid.element[from]!
      let index = indexByHash.get(hash)
      if (index === undefined) {
        const element = findElementByHash(hash)
        index = elements.length
        elements.push({
          id: element?.id ?? `Unknown ${hash}`,
          name: element?.name ?? 'Unknown element',
          state: element?.state ?? 'Unknown',
          cells: 0,
          mass: 0,
        })
        indexByHash.set(hash, index)
      }
      const entry = elements[index]!
      entry.cells++
      entry.mass += grid.mass[from]!
      cells[to] = index
      temperature[to] = grid.temperature[from]!
      mass[to] = grid.mass[from]!
    }
  }

  return {
    width: bounds.width,
    height: bounds.height,
    elements,
    cells,
    temperature,
    mass,
    markers: markersIn(save, bounds),
  }
}
