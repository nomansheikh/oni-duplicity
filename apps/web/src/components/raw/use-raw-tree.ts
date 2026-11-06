import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { toast } from 'sonner'
import { saveClient } from '@/lib/save-client'
import type { RawChildren, RawPath } from '@/worker/model'
import { isContainer, keyOf, PAGE, type Row } from './types'

export function useRawTree(revision: number, scrollRef: RefObject<HTMLDivElement | null>) {
  const [root, setRoot] = useState<RawPath>([])
  const [nodes, setNodes] = useState<Map<string, RawChildren>>(new Map())
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [reveal, setReveal] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)

  const load = useCallback(async (path: RawPath, offset = 0, limit = PAGE) => {
    const children = await saveClient.rawChildren(path, offset, limit)
    setNodes((prev) => {
      const next = new Map(prev)
      const existing = prev.get(keyOf(path))
      next.set(
        keyOf(path),
        offset > 0 && existing
          ? { entries: [...existing.entries, ...children.entries], total: children.total }
          : children,
      )
      return next
    })
  }, [])

  // Reload the root and every open node after each edit, undo or redo, keeping what was paged in.
  const loadedRef = useRef({ nodes, open })
  loadedRef.current = { nodes, open }
  useEffect(() => {
    const { nodes: known, open: expanded } = loadedRef.current
    const paths = [root, ...[...expanded].map((k) => JSON.parse(k) as RawPath)]
    void Promise.all(
      paths.map(async (path) => {
        const loaded = known.get(keyOf(path))?.entries.length ?? PAGE
        try {
          const children = await saveClient.rawChildren(path, 0, Math.max(loaded, PAGE))
          return [keyOf(path), children] as const
        } catch {
          return null
        }
      }),
    ).then((results) => {
      const next = new Map<string, RawChildren>()
      for (const result of results) if (result) next.set(result[0], result[1])
      setNodes(next)
      setOpen((prev) => new Set([...prev].filter((k) => next.has(k))))
    })
  }, [revision, root])

  // Open the whole route to a path (loading each level far enough to include it), then scroll.
  const revealPath = async (path: RawPath) => {
    try {
      const steps = await saveClient.rawReveal(path)
      setRoot([])
      setNodes((prev) => {
        const next = new Map(prev)
        for (const step of steps) next.set(keyOf(step.path), step.children)
        return next
      })
      setOpen((prev) => {
        const next = new Set(prev)
        for (let i = 1; i < path.length; i++) next.add(keyOf(path.slice(0, i)))
        return next
      })
      setReveal(keyOf(path))
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const toggle = (path: RawPath) => {
    const key = keyOf(path)
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    if (!nodes.has(key)) void load(path)
  }

  const rows = useMemo(() => {
    const out: Row[] = []
    const walk = (path: RawPath, depth: number) => {
      const children = nodes.get(keyOf(path))
      if (!children) return
      for (const entry of children.entries) {
        out.push({ type: 'entry', entry, depth, parentCanAdd: children.canAdd === true })
        if (isContainer(entry) && open.has(keyOf(entry.path))) {
          walk(entry.path, depth + 1)
        }
      }
      if (children.entries.length < children.total) {
        out.push({
          type: 'more',
          path,
          depth,
          loaded: children.entries.length,
          total: children.total,
        })
      }
    }
    walk(root, 0)
    return out
  }, [nodes, open, root])

  // The virtualizer hands back fresh functions each render; the compiler skips this component.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 44,
    overscan: 16,
  })

  useEffect(() => {
    if (!reveal) return
    const index = rows.findIndex((row) => row.type === 'entry' && keyOf(row.entry.path) === reveal)
    if (index < 0) return
    virtualizer.scrollToIndex(index, { align: 'center' })
    setReveal(null)
    setHighlight(reveal)
    const timer = setTimeout(() => setHighlight(null), 3000)
    return () => clearTimeout(timer)
    // The virtualizer object changes every render; the row list is what matters.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [reveal, rows])

  const jumpTo = async (path: RawPath) => {
    try {
      await saveClient.rawChildren(path, 0, 1)
      setOpen(new Set())
      setRoot(path)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return { root, open, highlight, rows, virtualizer, load, revealPath, toggle, jumpTo }
}
