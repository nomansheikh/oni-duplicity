import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Copy,
  EllipsisVertical,
  Search,
  SearchX,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { Progress, meterTone } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import type { Catalogs, DuplicantProfile, DuplicantView, Edit } from '@/worker/model'
import {
  SORT_OPTIONS,
  arrivalCycle,
  defaultDescending,
  masteredOf,
  searchDuplicants,
  sortDuplicants,
  stressOf,
  type SortKey,
} from '@/lib/duplicants'
import { fmt, portraitParts } from '@/lib/format'
import { DuplicantAvatar } from '../common'
import { ColonyActions } from './ColonyActions'
import { PageHeader } from '../page-header'
import { DuplicantEditor } from './DuplicantEditor'
import { EmptyState } from '../empty-state'

export function DuplicantsPage({
  duplicants,
  catalogs,
  selectedId,
  onSelect,
  onEdit,
}: {
  duplicants: DuplicantView[]
  catalogs: Catalogs
  selectedId: string | undefined
  onSelect: (id: string) => void
  onEdit: (edit: Edit) => void
}) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('save')
  const [descending, setDescending] = useState(false)
  const [clipboard, setClipboard] = useState<DuplicantProfile | null>(null)
  const healthOf = (d: DuplicantView) => d.amounts.find((a) => a.id === 'HitPoints')?.value ?? 0
  const selected = duplicants.find((d) => d.id === selectedId) ?? duplicants[0]
  const visible = sortDuplicants(searchDuplicants(duplicants, query), sortKey, descending)
  const metric = (d: DuplicantView): string | null => {
    switch (sortKey) {
      case 'arrival':
        return `Cycle ${arrivalCycle(d)}`
      case 'experience':
        return `${fmt(d.experience, 0)} XP`
      case 'skills':
        return `${masteredOf(d)} skills`
      case 'stress':
        return `${fmt(stressOf(d), 0)}%`
      default:
        return null
    }
  }

  return (
    <>
      <PageHeader
        title="Duplicants"
        description="Edit a duplicant's traits, skills, attributes, needs, effects and look. Pick one from the list."
        actions={<ColonyActions onEdit={onEdit} />}
        summary={[
          { label: 'Duplicants', value: duplicants.length },
          { label: 'Bionic', value: duplicants.filter((d) => d.isBionic).length },
        ]}
      />
      <div className="grid gap-4 @4xl/main:grid-cols-[22rem_1fr] md:gap-6">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Roster</CardTitle>
            <CardDescription>
              {visible.length === duplicants.length
                ? `${duplicants.length} in this colony`
                : `${visible.length} of ${duplicants.length} in this colony`}
            </CardDescription>
            <CardAction>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Roster actions">
                    <EllipsisVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={!selected || selected.isBionic}
                    onSelect={() => selected && onEdit({ type: 'cloneDuplicant', id: selected.id })}
                  >
                    <Copy /> Clone {selected?.name ?? 'duplicant'}
                    {selected?.isBionic && ' (bionic)'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            <InputGroup>
              <InputGroupInput
                placeholder="Search name, trait or interest"
                aria-label="Search duplicants"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </InputGroup>
            <div className="flex items-center gap-2">
              <Select
                value={sortKey}
                onValueChange={(value) => {
                  setSortKey(value as SortKey)
                  setDescending(defaultDescending(value as SortKey))
                }}
              >
                <SelectTrigger className="flex-1" aria-label="Sort duplicants">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.key} value={o.key}>
                      Sort: {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                aria-label={descending ? 'Descending order' : 'Ascending order'}
                onClick={() => setDescending((d) => !d)}
              >
                {descending ? <ArrowDownNarrowWide /> : <ArrowUpNarrowWide />}
              </Button>
            </div>
            <ScrollArea className="h-[calc(100svh-19rem)]">
              <ItemGroup className="gap-1 pr-3">
                {visible.map((d) => (
                  <Item
                    key={d.id}
                    asChild
                    size="sm"
                    variant={d.id === selected?.id ? 'muted' : 'default'}
                    className={d.id === selected?.id ? 'border-primary/60' : 'hover:bg-muted/30'}
                  >
                    <button type="button" onClick={() => onSelect(d.id)} className="text-left">
                      <ItemMedia>
                        <DuplicantAvatar
                          name={d.name}
                          parts={portraitParts(d.appearance)}
                          size={48}
                        />
                      </ItemMedia>
                      <ItemContent className="gap-2">
                        <ItemTitle className="type-h3 normal-case">
                          {d.name}
                          <span className="type-caption text-muted-foreground">
                            {d.age} {d.age === 1 ? 'cycle' : 'cycles'}
                          </span>
                        </ItemTitle>
                        <ItemDescription className="grid grid-cols-[3.5rem_1fr] items-center gap-x-2 gap-y-1 type-caption">
                          Health
                          <Progress
                            value={healthOf(d)}
                            tone={meterTone('health', healthOf(d))}
                            aria-label={`${d.name} health`}
                          />
                          Stress
                          <Progress
                            value={stressOf(d)}
                            tone={meterTone('stress', stressOf(d))}
                            aria-label={`${d.name} stress`}
                          />
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions className="flex-col items-end gap-1">
                        {metric(d) && (
                          <span className="type-caption text-fg-2 tabular-nums">{metric(d)}</span>
                        )}
                        {d.isBionic && <Badge variant="secondary">Bionic</Badge>}
                      </ItemActions>
                    </button>
                  </Item>
                ))}
                {visible.length === 0 && (
                  <EmptyState
                    size="compact"
                    icon={SearchX}
                    title="No duplicants"
                    description={
                      duplicants.length === 0
                        ? 'The colony is empty. Where did everyone go?'
                        : 'Nobody matches that search. Try another name.'
                    }
                  />
                )}
              </ItemGroup>
            </ScrollArea>
          </CardContent>
        </Card>
        {selected ? (
          <DuplicantEditor
            key={selected.id}
            dupe={selected}
            catalogs={catalogs}
            clipboard={clipboard}
            onCopy={setClipboard}
            onEdit={onEdit}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No duplicants</CardTitle>
              <CardDescription>This save has no duplicants to edit.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </>
  )
}
