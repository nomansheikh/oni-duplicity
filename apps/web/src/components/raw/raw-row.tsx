import {
  ChevronRight,
  Copy,
  CopyPlus,
  CornerDownRight,
  EllipsisVertical,
  Plus,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Edit } from '@/worker/model'
import { RawValue } from './raw-value'
import { INDENT, isContainer, KIND_STYLES, type Row } from './types'

function AddItem({ enabled, onSelect }: { enabled: boolean; onSelect: () => void }) {
  return (
    <DropdownMenuItem
      disabled={!enabled}
      onSelect={onSelect}
      title={
        enabled
          ? 'Appends a zeroed item built from the save’s own type definitions'
          : 'The item type is only known for data the save describes with a template'
      }
    >
      <Plus /> Add item
    </DropdownMenuItem>
  )
}

export function RawRow({
  row,
  expanded,
  highlighted,
  onToggle,
  onEdit,
  onCopyPath,
  onFocus,
}: {
  row: Extract<Row, { type: 'entry' }>
  expanded: boolean
  highlighted: boolean
  onToggle: () => void
  onEdit: (edit: Edit) => void
  onCopyPath: () => void
  onFocus: () => void
}) {
  const { entry, depth } = row
  // Array items are the only entries with numeric keys.
  const inArray = typeof entry.key === 'number'
  const container = isContainer(entry)
  return (
    <div
      className={cn(
        'group relative flex h-full items-center gap-2 pr-2 hover:bg-hover-row',
        highlighted && 'bg-warn/15 ring-2 ring-primary ring-warn! ring-inset',
      )}
      style={{ paddingLeft: depth * INDENT + 8 }}
    >
      {Array.from({ length: depth }, (_, level) => (
        <span
          key={level}
          aria-hidden
          className="absolute inset-y-0 w-px bg-edge/40"
          style={{ left: level * INDENT + 20 }}
        />
      ))}
      {container && (entry.size ?? 0) > 0 ? (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={expanded ? 'Collapse' : 'Expand'}
          onClick={onToggle}
        >
          <ChevronRight className={cn('transition-transform', expanded && 'rotate-90')} />
        </Button>
      ) : (
        <span className="w-6 shrink-0" />
      )}
      <button
        type="button"
        className={cn(
          'min-w-44 shrink-0 truncate text-left font-mono type-small',
          container ? 'cursor-pointer font-bold text-white' : 'cursor-default text-fg-2',
        )}
        onClick={container ? onToggle : undefined}
      >
        {typeof entry.key === 'number' ? `[${entry.key}]` : entry.key}
      </button>
      {entry.label && (
        <Badge variant="secondary" className="max-w-72 justify-start font-mono">
          <span className="truncate">{entry.label}</span>
        </Badge>
      )}
      <div className={cn('min-w-0 flex-1 font-mono type-small', KIND_STYLES[entry.kind])}>
        <RawValue entry={entry} onEdit={onEdit} />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Row actions"
            className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onSelect={onCopyPath}>
            <Copy /> Copy path
          </DropdownMenuItem>
          {container && (
            <DropdownMenuItem onSelect={onFocus}>
              <CornerDownRight /> Open here
            </DropdownMenuItem>
          )}
          {entry.kind === 'array' && (
            <>
              <DropdownMenuSeparator />
              <AddItem
                enabled={entry.canAdd === true}
                onSelect={() => onEdit({ type: 'rawAdd', path: entry.path })}
              />
            </>
          )}
          {inArray && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onEdit({ type: 'rawDuplicate', path: entry.path })}>
                <CopyPlus /> Duplicate item
              </DropdownMenuItem>
              {row.parentCanAdd && (
                <DropdownMenuItem
                  onSelect={() => onEdit({ type: 'rawAdd', path: entry.path.slice(0, -1) })}
                >
                  <Plus /> Add item to this array
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onEdit({ type: 'rawRemove', path: entry.path })}
              >
                <Trash2 /> Remove item
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
