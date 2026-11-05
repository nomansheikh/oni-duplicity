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
import { Card, CardContent } from '@/components/ui/card'
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
import { PageHeader } from './page-header'

const PAGE = 500
/** Pixels of indent per tree level. */
const INDENT = 20

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

  const copyPath = (path: RawPath) => {
    void navigator.clipboard.writeText(formatPath(path))
    toast.success('Path copied', { description: formatPath(path) })
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Raw data"
        description="Every value in the save. Changes here skip the safety rails of the other editors, but undo still works. Byte arrays are shown but cannot be edited."
        actions={
          <InputGroup className="w-72">
            <InputGroupInput
              placeholder="Go to path, e.g. gameObjects[0]"
              className="font-mono"
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
        }
      />
      <Card variant="well" className="gap-4">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 border border-warn/50 bg-warn/10 px-3 py-2 type-small">
            <TriangleAlert className="size-5 shrink-0 text-warn" />
            Type names, lengths and IDs are read by the game as-is. Only change values you
            understand.
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
              <label className="flex items-center gap-2 type-small">
                <Switch size="sm" checked={searchValues} onCheckedChange={setSearchValues} />
                Also match values
              </label>
              <span className="type-caption text-fg-2">
                Type part of a key (<span className="font-mono text-white">numberOfCycles</span>) or
                a path (<span className="font-mono text-white">gameInfo.numberOf</span>).
              </span>
            </div>
            {search.state === 'done' && (
              <SearchResults result={search} onPick={(path) => void revealPath(path)} />
            )}
          </div>
          <Breadcrumb>
            <BreadcrumbList className="font-mono type-small">
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
              <p className="p-6 text-center type-small text-fg-2">Nothing here.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
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
  object: 'text-fg-2',
  array: 'text-fg-2',
  string: 'text-good',
  number: 'text-info',
  bigint: 'text-info',
  boolean: 'text-gold',
  bytes: 'text-warn',
  null: 'text-fg-2',
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
const MATCH_VARIANT: Record<RawMatch['by'], 'info' | 'warn' | 'good'> = {
  key: 'info',
  path: 'warn',
  value: 'good',
}

/** A path with the last segment (the key itself) in white and the route to it dimmed. */
function PathText({ path }: { path: RawPath }) {
  const full = formatPath(path)
  const last = formatPath(path.slice(-1))
  const split = full.length - last.length
  const tail = full.endsWith(last) ? split : full.length
  return (
    <span className="min-w-0 flex-1 truncate" title={full}>
      <span className="text-fg-2">{full.slice(0, tail)}</span>
      <span className="font-bold text-white">{full.slice(tail)}</span>
    </span>
  )
}

function SearchResults({
  result,
  onPick,
}: {
  result: RawSearchResult
  onPick: (path: RawPath) => void
}) {
  return (
    <div className="border border-ink bg-inset">
      <div className="flex items-center justify-between gap-3 border-b border-ink bg-field px-3 py-1.5 type-caption text-fg-2">
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
                className="flex w-full items-center gap-3 px-3 py-1.5 text-left font-mono type-small hover:bg-hover-row"
                onClick={() => onPick(match.path)}
              >
                <Badge variant={MATCH_VARIANT[match.by]} className="w-16 shrink-0">
                  {MATCH_LABEL[match.by]}
                </Badge>
                <PathText path={match.path} />
                {match.value !== undefined && (
                  <span className="max-w-64 shrink-0 truncate text-good">{match.value}</span>
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
          {entry.size} bytes <span className="text-fg-2">{entry.value}</span>{' '}
          <Badge variant="outline" title="Byte arrays cannot be edited here">
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
          className={cn('h-8 max-w-md font-mono', KIND_STYLES[entry.kind])}
          onCommit={(text) => set(entry.kind === 'string' ? text : text.trim())}
        />
      )
  }
}
