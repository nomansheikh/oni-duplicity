import { ParseError } from './binary.ts'

/** The simulation's cell grid, read from a save's sim data. */
export interface SimGrid {
  version: number
  /** The grid has a one-cell border: game cell (x, y) is grid cell (x + 1, y + 1). */
  width: number
  height: number
  /** Element SimHash per cell, row by row from the bottom. */
  element: Int32Array
  /** Kelvin per cell. */
  temperature: Float32Array
  /** Kilograms per cell. */
  mass: Float32Array
}

const MAGIC = 'SIMSAVE\0'
/** The 20-byte header is followed by 9 bytes not decoded yet, then the cells. */
const CELLS_OFFSET = 29
/** Element hash (i32), temperature (f32), mass (f32), then 4 bytes not decoded yet. */
const CELL_SIZE = 16

/** Reads element, temperature and mass per cell. Disease and later sections are skipped. */
export function readSimGrid(simData: Uint8Array): SimGrid {
  const view = new DataView(simData.buffer, simData.byteOffset, simData.byteLength)
  if (
    simData.length < CELLS_OFFSET ||
    new TextDecoder().decode(simData.subarray(0, MAGIC.length)) !== MAGIC
  ) {
    throw new ParseError('Sim data does not start with SIMSAVE', 0, 'sim data')
  }
  const version = view.getInt32(8, true)
  const width = view.getInt32(12, true)
  const height = view.getInt32(16, true)
  const cells = width * height
  if (width <= 0 || height <= 0 || CELLS_OFFSET + cells * CELL_SIZE > simData.length) {
    throw new ParseError(`A ${width}×${height} grid does not fit the sim data`, 12, 'sim data')
  }
  const element = new Int32Array(cells)
  const temperature = new Float32Array(cells)
  const mass = new Float32Array(cells)
  for (let i = 0, o = CELLS_OFFSET; i < cells; i++, o += CELL_SIZE) {
    element[i] = view.getInt32(o, true)
    temperature[i] = view.getFloat32(o + 4, true)
    mass[i] = view.getFloat32(o + 8, true)
  }
  return { version, width, height, element, temperature, mass }
}
