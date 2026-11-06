/** Pan and zoom maths for the detail map. Everything is in CSS pixels. */

export interface Size {
  width: number
  height: number
}

/** `x` and `y` place the map's top-left corner inside the viewport; `zoom` is pixels per cell. */
export interface View {
  zoom: number
  x: number
  y: number
}

export const MAX_ZOOM = 16

/** The zoom at which the whole map just fits the box. */
export function fitZoom(map: Size, box: Size): number {
  return Math.max(0.01, Math.min(box.width / map.width, box.height / map.height))
}

/** Keeps the map in the box: centred when smaller than it, never panned fully out of it. */
export function clampView(view: View, map: Size, box: Size): View {
  const axis = (offset: number, mapSize: number, boxSize: number) => {
    const size = mapSize * view.zoom
    return size <= boxSize ? (boxSize - size) / 2 : Math.min(0, Math.max(boxSize - size, offset))
  }
  return {
    zoom: view.zoom,
    x: axis(view.x, map.width, box.width),
    y: axis(view.y, map.height, box.height),
  }
}

export function fitView(map: Size, box: Size): View {
  return clampView({ zoom: fitZoom(map, box), x: 0, y: 0 }, map, box)
}

/** Multiplies the zoom by `factor`, keeping the map point under `anchor` where it is. */
export function zoomAt(
  view: View,
  factor: number,
  anchor: { x: number; y: number },
  map: Size,
  box: Size,
): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(fitZoom(map, box), view.zoom * factor))
  const ratio = zoom / view.zoom
  return clampView(
    { zoom, x: anchor.x - (anchor.x - view.x) * ratio, y: anchor.y - (anchor.y - view.y) * ratio },
    map,
    box,
  )
}

/** The cell under a viewport point, or undefined outside the map. The origin is bottom-left. */
export function cellAt(view: View, point: { x: number; y: number }, map: Size) {
  const x = Math.floor((point.x - view.x) / view.zoom)
  const row = Math.floor((point.y - view.y) / view.zoom)
  const y = map.height - 1 - row
  return x >= 0 && y >= 0 && x < map.width && y < map.height ? { x, y } : undefined
}

/** The viewport point at the centre of a cell. */
export function cellCentre(view: View, cell: { x: number; y: number }, map: Size) {
  return {
    x: view.x + (cell.x + 0.5) * view.zoom,
    y: view.y + (map.height - cell.y - 0.5) * view.zoom,
  }
}
