import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState } from 'react'
import type { Catalogs, DuplicantView, Edit } from '@/worker/model'
import { portraitParts } from '@/lib/format'
import { DuplicantAvatar } from '../common'
import { DuplicantEditor } from './DuplicantEditor'

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
  const selected = duplicants.find((d) => d.id === selectedId) ?? duplicants[0]
  const visible = duplicants.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
  const stressOf = (d: DuplicantView) => d.amounts.find((a) => a.id === 'Stress')?.value ?? 0

  return (
    <div className="grid gap-4 @4xl/main:grid-cols-[18rem_1fr] md:gap-6">
      <Card className="self-start">
        <CardHeader>
          <CardTitle>Duplicants</CardTitle>
          <CardDescription>{duplicants.length} in this colony</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <InputGroup>
            <InputGroupInput
              placeholder="Search by name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
          <ScrollArea className="h-[calc(100svh-19rem)]">
            <ItemGroup className="gap-1 pr-3">
              {visible.map((d) => (
                <Item
                  key={d.id}
                  asChild
                  size="sm"
                  variant={d.id === selected?.id ? 'muted' : 'default'}
                  className={d.id === selected?.id ? 'ring-1 ring-primary/40' : ''}
                >
                  <button type="button" onClick={() => onSelect(d.id)} className="text-left">
                    <ItemMedia>
                      <DuplicantAvatar
                        name={d.name}
                        parts={portraitParts(d.appearance)}
                        size={36}
                      />
                    </ItemMedia>
                    <ItemContent className="gap-1.5">
                      <ItemTitle>{d.name}</ItemTitle>
                      <ItemDescription className="flex items-center gap-2 text-xs">
                        Stress
                        <Progress value={stressOf(d)} className="h-1 w-16" />
                      </ItemDescription>
                    </ItemContent>
                    {d.isBionic && (
                      <ItemActions>
                        <Badge variant="secondary">Bionic</Badge>
                      </ItemActions>
                    )}
                  </button>
                </Item>
              ))}
            </ItemGroup>
          </ScrollArea>
        </CardContent>
      </Card>
      {selected ? (
        <DuplicantEditor key={selected.id} dupe={selected} catalogs={catalogs} onEdit={onEdit} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No duplicants</CardTitle>
            <CardDescription>This save has no duplicants to edit.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
