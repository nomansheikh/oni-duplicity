import type { RefObject } from 'react'
import { PackageOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Edit, RawPath } from '@/worker/model'
import { EmptyState } from '../empty-state'
import { RawRow } from './raw-row'
import { INDENT, keyOf, PAGE } from './types'
import type { useRawTree } from './use-raw-tree'

type Tree = ReturnType<typeof useRawTree>

export function RawTree({
  tree,
  scrollRef,
  onEdit,
  onCopyPath,
}: {
  tree: Tree
  scrollRef: RefObject<HTMLDivElement | null>
  onEdit: (edit: Edit) => void
  onCopyPath: (path: RawPath) => void
}) {
  const { rows, virtualizer, open, highlight, load, toggle, jumpTo } = tree
  return (
    <div
      ref={scrollRef}
      className="h-[calc(100svh-19rem)] min-h-80 overflow-auto border border-ink bg-inset"
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const row = rows[item.index]!
          return (
            <div
              key={item.key}
              className="absolute inset-x-0 top-0 border-b border-ink/70 last:border-b-0"
              style={{ transform: `translateY(${item.start}px)`, height: item.size }}
            >
              {row.type === 'more' ? (
                <div
                  className="flex h-full items-center"
                  style={{ paddingLeft: row.depth * INDENT + 40 }}
                >
                  <Button variant="link" size="sm" onClick={() => void load(row.path, row.loaded)}>
                    Load {Math.min(PAGE, row.total - row.loaded)} more of {row.total - row.loaded}{' '}
                    remaining
                  </Button>
                  {row.total - row.loaded > PAGE && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => void load(row.path, row.loaded, row.total - row.loaded)}
                    >
                      Load all
                    </Button>
                  )}
                </div>
              ) : (
                <RawRow
                  row={row}
                  expanded={open.has(keyOf(row.entry.path))}
                  highlighted={highlight === keyOf(row.entry.path)}
                  onToggle={() => toggle(row.entry.path)}
                  onEdit={onEdit}
                  onCopyPath={() => onCopyPath(row.entry.path)}
                  onFocus={() => void jumpTo(row.entry.path)}
                />
              )}
            </div>
          )
        })}
      </div>
      {rows.length === 0 && (
        <EmptyState
          size="compact"
          className="border-0"
          icon={PackageOpen}
          title="Nothing here"
          description="This node is empty. Not a value in sight."
        />
      )}
    </div>
  )
}
