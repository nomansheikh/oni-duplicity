import { useState } from 'react'
import { FlaskConical, PartyPopper, Search, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Edit, TechView } from '@/worker/model'
import { EmptyState } from './empty-state'
import { PageHeader } from './page-header'

export function ResearchPage({
  techs,
  onEdit,
}: {
  techs: TechView[]
  onEdit: (edit: Edit) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const done = techs.filter((t) => t.complete).length
  const visible = techs.filter(
    (t) =>
      (filter === 'all' || (filter === 'done') === t.complete) &&
      `${t.name} ${t.id}`.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Research"
        description="Toggling a tech marks it complete; prerequisites are not checked."
        actions={
          <Button onClick={() => onEdit({ type: 'researchAll' })} disabled={done === techs.length}>
            <FlaskConical /> Research everything
          </Button>
        }
        summary={[
          { label: 'Researched', value: `${done} / ${techs.length}` },
          { label: 'Remaining', value: techs.length - done },
        ]}
      />
      <Card variant="well">
        <CardContent className="space-y-4">
          <Progress
            variant="task"
            value={(done / Math.max(techs.length, 1)) * 100}
            label="Researched"
            state={`${done} / ${techs.length}`}
            aria-label="Research progress"
          />
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={filter}
              onValueChange={(v) => setFilter(v || 'all')}
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="done">Researched</ToggleGroupItem>
              <ToggleGroupItem value="todo">Not yet</ToggleGroupItem>
            </ToggleGroup>
            <InputGroup className="h-[2.1rem] w-64 rounded-none border-ink bg-inset">
              <InputGroupInput
                className="h-full border-0! bg-transparent! shadow-none!"
                placeholder="Search techs"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </InputGroup>
          </div>
          {visible.length === 0 && (
            <EmptyState
              icon={query ? SearchX : PartyPopper}
              title={query ? 'No such tech' : filter === 'todo' ? 'All researched' : 'Nothing here'}
              description={
                query
                  ? `Nothing in the research tree matches "${query}". The scientists checked twice.`
                  : filter === 'todo'
                    ? "Everything's researched. The scientists are out of homework."
                    : 'No tech has been researched yet. The lab is awfully quiet.'
              }
              action={
                query || filter !== 'all'
                  ? {
                      label: query ? 'Clear search' : 'Show all',
                      onClick: () => {
                        setQuery('')
                        if (!query) setFilter('all')
                      },
                    }
                  : undefined
              }
              data-testid="research-empty"
            />
          )}
          <div className="grid gap-2 @2xl/main:grid-cols-2 @5xl/main:grid-cols-3">
            {visible.map((tech) => (
              <FieldLabel key={tech.id} htmlFor={`tech-${tech.id}`}>
                <Field orientation="horizontal" className="h-full border border-ink bg-well">
                  <FieldContent>
                    <FieldTitle>{tech.name}</FieldTitle>
                    {tech.desc && (
                      <FieldDescription className="line-clamp-2 normal-case">
                        {tech.desc}
                      </FieldDescription>
                    )}
                  </FieldContent>
                  <Switch
                    id={`tech-${tech.id}`}
                    checked={tech.complete}
                    onCheckedChange={(complete) =>
                      onEdit({ type: 'setTechResearched', techId: tech.id, complete })
                    }
                  />
                </Field>
              </FieldLabel>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
