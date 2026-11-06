import { useRef, useState } from 'react'
import { Loader2, Route, Search, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Switch } from '@/components/ui/switch'
import { formatPath, parsePath } from '@/lib/raw-path'
import type { Edit, RawPath } from '@/worker/model'
import { PageHeader } from './page-header'
import { RawBreadcrumb } from './raw/raw-breadcrumb'
import { RawTree } from './raw/raw-tree'
import { SearchResults } from './raw/search-results'
import { useRawSearch } from './raw/use-raw-search'
import { useRawTree } from './raw/use-raw-tree'

export function RawPage({ revision, onEdit }: { revision: number; onEdit: (edit: Edit) => void }) {
  const [goto, setGoto] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const tree = useRawTree(revision, scrollRef)
  const { query, setQuery, searchValues, setSearchValues, search } = useRawSearch(revision)
  const { root, jumpTo, revealPath } = tree

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
          <InputGroup className="w-80">
            <InputGroupInput
              placeholder="Go to path, e.g. header"
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
          <RawBreadcrumb root={root} onJump={(path) => void jumpTo(path)} />
          <RawTree tree={tree} scrollRef={scrollRef} onEdit={onEdit} onCopyPath={copyPath} />
        </CardContent>
      </Card>
    </div>
  )
}
