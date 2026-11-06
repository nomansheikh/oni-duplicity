import { describe, expect, it } from 'vite-plus/test'
import {
  cellAt,
  cellCentre,
  clampView,
  fitView,
  fitZoom,
  MAX_ZOOM,
  zoomAt,
} from './viewport-math.ts'

const map = { width: 100, height: 50 }
const box = { width: 400, height: 400 }

describe('fitView', () => {
  it('fits the width and centres the map vertically', () => {
    expect(fitZoom(map, box)).toBe(4)
    expect(fitView(map, box)).toEqual({ zoom: 4, x: 0, y: 100 })
  })
})

describe('zoomAt', () => {
  it('never zooms out past the fit or in past the maximum', () => {
    const fit = fitView(map, box)
    expect(zoomAt(fit, 0.1, { x: 0, y: 0 }, map, box).zoom).toBe(4)
    expect(zoomAt(fit, 1000, { x: 0, y: 0 }, map, box).zoom).toBe(MAX_ZOOM)
  })

  it('keeps the cell under the anchor in place', () => {
    const fit = fitView(map, box)
    const anchor = { x: 300, y: 200 }
    const before = cellAt(fit, anchor, map)
    const next = zoomAt(fit, 2, anchor, map, box)
    expect(next.zoom).toBe(8)
    expect(cellAt(next, anchor, map)).toEqual(before)
  })
})

describe('clampView', () => {
  it('keeps a zoomed map covering the box', () => {
    const view = clampView({ zoom: 8, x: 100, y: -9999 }, map, box)
    expect(view).toEqual({ zoom: 8, x: 0, y: 0 })
  })
})

describe('cells and viewport points', () => {
  const view = { zoom: 4, x: 0, y: 100 }

  it('reads the bottom-left origin from the top-left canvas', () => {
    expect(cellAt(view, { x: 1, y: 101 }, map)).toEqual({ x: 0, y: 49 })
    expect(cellAt(view, { x: 399, y: 299 }, map)).toEqual({ x: 99, y: 0 })
    expect(cellAt(view, { x: 10, y: 50 }, map)).toBeUndefined()
  })

  it('round-trips a cell through its centre', () => {
    const centre = cellCentre(view, { x: 10, y: 3 }, map)
    expect(cellAt(view, centre, map)).toEqual({ x: 10, y: 3 })
  })
})
