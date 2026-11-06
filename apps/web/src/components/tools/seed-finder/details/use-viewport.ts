import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { clampView, fitView, zoomAt, type Size, type View } from './viewport-math'

/**
 * Pan and zoom for a map inside a box: the wheel zooms about the cursor, a drag pans, and the
 * view refits whenever the box or the map changes size.
 */
export function useViewport(boxRef: RefObject<HTMLDivElement | null>, map: Size) {
  const [box, setBox] = useState<Size>({ width: 0, height: 0 })
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 })
  const fitted = useRef('')

  useEffect(() => {
    const element = boxRef.current
    if (!element) return
    const measure = () => setBox({ width: element.clientWidth, height: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [boxRef])

  // Fit each map the first time it is measured; afterwards keep the zoom and re-clamp.
  useEffect(() => {
    if (box.width === 0 || box.height === 0) return
    const key = `${map.width}x${map.height}`
    if (fitted.current !== key) {
      fitted.current = key
      setView(fitView(map, box))
    } else {
      setView((v) => {
        const fit = fitView(map, box)
        return clampView({ ...v, zoom: Math.max(v.zoom, fit.zoom) }, map, box)
      })
    }
  }, [map, box])

  // A native listener, because React's wheel handler is passive and cannot stop the page scroll.
  useEffect(() => {
    const element = boxRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = element.getBoundingClientRect()
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      const factor = Math.exp(-event.deltaY * 0.0015)
      setView((v) => zoomAt(v, factor, anchor, map, box))
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [boxRef, map, box])

  const zoomBy = useCallback(
    (factor: number) =>
      setView((v) => zoomAt(v, factor, { x: box.width / 2, y: box.height / 2 }, map, box)),
    [map, box],
  )
  const fit = useCallback(() => setView(fitView(map, box)), [map, box])
  const panBy = useCallback(
    (dx: number, dy: number) =>
      setView((v) => clampView({ ...v, x: v.x + dx, y: v.y + dy }, map, box)),
    [map, box],
  )
  return { view, box, zoomBy, fit, panBy }
}
