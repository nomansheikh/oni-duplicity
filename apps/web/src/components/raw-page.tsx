import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  ChevronRight,
  Copy,
  CopyPlus,
  CornerDownRight,
  EllipsisVertical,
  Filter,
  Route,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Switch } from '@/components/ui/switch'
import { saveClient } from '@/lib/save-client'
import { cn } from '@/lib/utils'
import type { Edit, RawChildren, RawEntry, RawPath } from '@/worker/model'
import { formatPath, parsePath } from '@/lib/raw-path'
import { CommitInput } from './common'

const PAGE = 500

const keyOf = (path: RawPath) => JSON.stringify(path)

const isContainer = (entry: RawEntry) => entry.kind === 'object' || entry.kind === 'array'

type Row =
  | { type: 'entry'; entry: RawEntry; depth: number }
  | { type: 'more'; path: RawPath; depth: number; loaded: number; total: number }

export function RawPage({ revision, onEdit }: { revision: number; onEdit: (edit: Edit) => void }) {
  const [root, setRoot] = useState<RawPath>([])
  const [nodes, setNodes] = useState<Map<string, RawChildren>>(new Map())
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [goto, setGoto] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

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
        out.push({ type: 'entry', entry, depth })
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
    const needle = filter.trim().toLowerCase()
    if (!needle) return out
    return out.filter(
      (row) =>
        row.type === 'entry' &&
        `${row.entry.key} ${row.entry.label ?? ''} ${row.entry.value ?? ''}`
          .toLowerCase()
          .includes(needle),
    )
  }, [nodes, open, root, filter])

  // The virtualizer hands back fresh functions each render; the compiler skips this component.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 16,
  })

  const jumpTo = async (path: RawPath) => {
    try {
      await saveClient.rawChildren(path, 0, 1)
      setOpen(new Set())
      setFilter('')
      setRoot(path)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const copyPath = (path: RawPath) => {
    void navigator.clipboard.writeText(formatPath(path))
    toast.success('Path copied', { description: formatPath(path) })
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Raw data</CardTitle>
        <CardDescription>
          Every value in the save. Changes here skip the safety rails of the other editors, but undo
          still works.
        </CardDescription>
        <CardAction className="flex flex-wrap items-center gap-2">
          <InputGroup className="w-48">
            <InputGroupInput
              placeholder="Filter loaded rows"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <InputGroupAddon>
              <Filter />
            </InputGroupAddon>
          </InputGroup>
          <InputGroup className="w-72">
            <InputGroupInput
              placeholder="Go to path, e.g. gameObjects[0]"
              className="font-mono text-xs"
              value={goto}
              onChange={(e) => setGoto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void jumpTo(parsePath(goto))
              }}
            />
            <InputGroupAddon>
              <Route />
            </InputGroupAddon>
          </InputGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 rounded-md border border-chart-3/40 bg-chart-3/10 px-3 py-2 text-sm">
          <TriangleAlert className="size-4 shrink-0 text-chart-3" />
          Type names, lengths and IDs are read by the game as-is. Only change values you understand.
        </div>
        <Breadcrumb>
          <BreadcrumbList className="font-mono text-xs">
            <BreadcrumbItem>
              {root.length === 0 ? (
                <BreadcrumbPage>save</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <button type="button" onClick={() => void jumpTo([])}>
                    save
                  </button>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {root.map((part, i) => (
              <RootCrumb
                key={i}
                label={typeof part === 'number' ? `[${part}]` : part}
                current={i === root.length - 1}
                onClick={() => void jumpTo(root.slice(0, i + 1))}
              />
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <div
          ref={scrollRef}
          className="h-[calc(100svh-19rem)] min-h-80 overflow-auto rounded-md border"
        >
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index]!
              return (
                <div
                  key={item.key}
                  className="absolute inset-x-0 top-0 border-b last:border-b-0"
                  style={{ transform: `translateY(${item.start}px)`, height: item.size }}
                >
                  {row.type === 'more' ? (
                    <div
                      className="flex h-full items-center"
                      style={{ paddingLeft: row.depth * 16 + 36 }}
                    >
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => void load(row.path, row.loaded)}
                      >
                        Load {Math.min(PAGE, row.total - row.loaded)} more of{' '}
                        {row.total - row.loaded} remaining
                      </Button>
                    </div>
                  ) : (
                    <RawRow
                      row={row}
                      expanded={open.has(keyOf(row.entry.path))}
                      showPath={filter.trim() !== ''}
                      onToggle={() => toggle(row.entry.path)}
                      onEdit={onEdit}
                      onCopyPath={() => copyPath(row.entry.path)}
                      onFocus={() => void jumpTo(row.entry.path)}
                    />
                  )}
                </div>
              )
            })}
          </div>
          {rows.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {filter ? 'No loaded rows match the filter.' : 'Nothing here.'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function RootCrumb({
  label,
  current,
  onClick,
}: {
  label: string
  current: boolean
  onClick: () => void
}) {
  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        {current ? (
          <BreadcrumbPage>{label}</BreadcrumbPage>
        ) : (
          <BreadcrumbLink asChild>
            <button type="button" onClick={onClick}>
              {label}
            </button>
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
    </>
  )
}

const KIND_STYLES: Record<string, string> = {
  object: 'text-muted-foreground',
  array: 'text-muted-foreground',
  string: 'text-emerald-600 dark:text-emerald-400',
  number: 'text-sky-600 dark:text-sky-400',
  bigint: 'text-sky-600 dark:text-sky-400',
  boolean: 'text-violet-600 dark:text-violet-400',
  bytes: 'text-amber-600 dark:text-amber-400',
  null: 'text-muted-foreground',
}

function RawRow({
  row,
  expanded,
  showPath,
  onToggle,
  onEdit,
  onCopyPath,
  onFocus,
}: {
  row: Extract<Row, { type: 'entry' }>
  expanded: boolean
  showPath: boolean
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
      className="group flex h-full items-center gap-2 pr-2 hover:bg-muted/50"
      style={{ paddingLeft: depth * 16 + 8 }}
    >
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
          'shrink-0 text-left font-mono text-xs',
          container ? 'cursor-pointer font-medium' : 'cursor-default text-muted-foreground',
        )}
        onClick={container ? onToggle : undefined}
      >
        {showPath
          ? formatPath(entry.path)
          : typeof entry.key === 'number'
            ? `[${entry.key}]`
            : entry.key}
      </button>
      {entry.label && (
        <Badge variant="secondary" className="max-w-72 justify-start font-mono text-[11px]">
          <span className="truncate">{entry.label}</span>
        </Badge>
      )}
      <div className={cn('min-w-0 flex-1 font-mono text-xs', KIND_STYLES[entry.kind])}>
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
          {inArray && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onEdit({ type: 'rawDuplicate', path: entry.path })}>
                <CopyPlus /> Duplicate item
              </DropdownMenuItem>
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

function RawValue({ entry, onEdit }: { entry: RawEntry; onEdit: (edit: Edit) => void }) {
  const set = (value: string | number | boolean | null) =>
    onEdit({ type: 'rawSet', path: entry.path, value })
  switch (entry.kind) {
    case 'object':
      return <span>{`{ ${entry.size} }`}</span>
    case 'array':
      return <span>{`[ ${entry.size} ]`}</span>
    case 'bytes':
      return (
        <span className="truncate">
          {entry.size} bytes <span className="text-muted-foreground">{entry.value}</span>
        </span>
      )
    case 'boolean':
      return (
        <Switch
          size="sm"
          checked={entry.value === true}
          aria-label={String(entry.key)}
          onCheckedChange={(checked) => set(checked)}
        />
      )
    case 'null':
      return <span>null</span>
    default:
      return (
        <CommitInput
          value={String(entry.value)}
          aria-label={String(entry.key)}
          className={cn('h-7 max-w-md font-mono text-xs', KIND_STYLES[entry.kind])}
          onCommit={(text) => set(entry.kind === 'string' ? text : text.trim())}
        />
      )
  }
}
