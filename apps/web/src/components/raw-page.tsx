import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  ChevronRight,
  Copy,
  CopyPlus,
  CornerDownRight,
  EllipsisVertical,
  Loader2,
  Plus,
  Route,
  Search,
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
import type { RawMatch, RawSearchResult } from '@/worker/raw'
import { formatPath, parsePath } from '@/lib/raw-path'
import { CommitInput } from './common'

const PAGE = 500

const keyOf = (path: RawPath) => JSON.stringify(path)

const isContainer = (entry: RawEntry) => entry.kind === 'object' || entry.kind === 'array'

/** Whole-tree search: wait this long after the last keystroke, show at most this many hits. */
const SEARCH_DEBOUNCE = 350
const SEARCH_LIMIT = 200
// Ids never repeat, even across remounts of the page, so a late cancel cannot hit a newer search.
let nextSearchId = 0

type Row =
  | { type: 'entry'; entry: RawEntry; depth: number; parentCanAdd: boolean }
  | { type: 'more'; path: RawPath; depth: number; loaded: number; total: number }

export function RawPage({ revision, onEdit }: { revision: number; onEdit: (edit: Edit) => void }) {
  const [root, setRoot] = useState<RawPath>([])
  const [nodes, setNodes] = useState<Map<string, RawChildren>>(new Map())
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [searchValues, setSearchValues] = useState(false)
  const [search, setSearch] = useState<
    { state: 'idle' } | { state: 'running' } | ({ state: 'done' } & RawSearchResult)
  >({ state: 'idle' })
  const [reveal, setReveal] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const searchId = useRef(0)
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

  // Search the whole save in the worker, debounced; a newer query cancels the one in flight.
  useEffect(() => {
    const text = query.trim()
    const id = ++nextSearchId
    searchId.current = id
    if (text.length < 2) {
      setSearch({ state: 'idle' })
      return
    }
    setSearch({ state: 'running' })
    const timer = setTimeout(() => {
      saveClient
        .rawSearch(id, { query: text, values: searchValues, limit: SEARCH_LIMIT })
        .then((result) => {
          if (id === searchId.current) setSearch({ state: 'done', ...result })
        })
        .catch((error: Error) => {
          // A superseded search rejects with "cancelled"; only the latest one may report.
          if (id === searchId.current && error.message !== 'cancelled') {
            setSearch({ state: 'idle' })
            toast.error(error.message)
          }
        })
    }, SEARCH_DEBOUNCE)
    return () => {
      clearTimeout(timer)
      void saveClient.cancelRawSearch(id)
    }
  }, [query, searchValues, revision])

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
    estimateSize: () => 40,
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
          still works. Byte arrays are shown but cannot be edited.
        </CardDescription>
        <CardAction className="flex flex-wrap items-center gap-2">
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
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <InputGroup className="max-w-md min-w-60 flex-1">
              <InputGroupInput
                placeholder="Search the whole save by key or path"
                aria-label="Search the whole save"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <InputGroupAddon>
                {search.state === 'running' ? <Loader2 className="animate-spin" /> : <Search />}
              </InputGroupAddon>
            </InputGroup>
            <label className="flex items-center gap-2 text-sm">
              <Switch size="sm" checked={searchValues} onCheckedChange={setSearchValues} />
              Also match values
            </label>
            <span className="text-xs text-muted-foreground">
              Type part of a key (<span className="font-mono">numberOfCycles</span>) or a path (
              <span className="font-mono">gameInfo.numberOf</span>).
            </span>
          </div>
          {search.state === 'done' && (
            <SearchResults result={search} onPick={(path) => void revealPath(path)} />
          )}
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
                      onCopyPath={() => copyPath(row.entry.path)}
                      onFocus={() => void jumpTo(row.entry.path)}
                    />
                  )}
                </div>
              )
            })}
          </div>
          {rows.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">Nothing here.</p>
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
        'group flex h-full items-center gap-2 pr-2 hover:bg-muted/50',
        highlighted && 'bg-primary/10 ring-1 ring-primary ring-inset',
      )}
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
        {typeof entry.key === 'number' ? `[${entry.key}]` : entry.key}
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

function AddItem({ enabled, onSelect }: { enabled: boolean; onSelect: () => void }) {
  return (
    <DropdownMenuItem
      disabled={!enabled}
      onSelect={onSelect}
      title={
        enabled
          ? 'Appends a zeroed item built from the save\u2019s own type definitions'
          : 'The item type is only known for data the save describes with a template'
      }
    >
      <Plus /> Add item
    </DropdownMenuItem>
  )
}

const MATCH_LABEL: Record<RawMatch['by'], string> = { key: 'key', path: 'path', value: 'value' }

function SearchResults({
  result,
  onPick,
}: {
  result: RawSearchResult
  onPick: (path: RawPath) => void
}) {
  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-muted-foreground">
        <span>
          {result.matches.length === 0
            ? 'No matches in the whole save'
            : `${result.matches.length}${result.truncated ? '+' : ''} match${result.matches.length === 1 ? '' : 'es'}${result.truncated ? ` (showing the first ${SEARCH_LIMIT}, narrow the search)` : ''}`}
        </span>
        <span>
          {result.scanned.toLocaleString()} values in {(result.ms / 1000).toFixed(1)} s
        </span>
      </div>
      {result.matches.length > 0 && (
        <ul className="max-h-56 overflow-auto" aria-label="Search results">
          {result.matches.map((match) => (
            <li key={keyOf(match.path)}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1 text-left font-mono text-xs hover:bg-muted/50"
                onClick={() => onPick(match.path)}
              >
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {MATCH_LABEL[match.by]}
                </Badge>
                <span className="min-w-0 flex-1 truncate">{formatPath(match.path)}</span>
                {match.value !== undefined && (
                  <span className="max-w-64 shrink-0 truncate text-muted-foreground">
                    {match.value}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
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
          {entry.size} bytes <span className="text-muted-foreground">{entry.value}</span>{' '}
          <Badge
            variant="outline"
            className="text-[10px]"
            title="Byte arrays cannot be edited here"
          >
            read-only
          </Badge>
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
