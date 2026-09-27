import { useState } from 'react'
import { FlaskConical, Search } from 'lucide-react'
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
    <Card>
      <CardHeader>
        <CardTitle>Research</CardTitle>
        <CardDescription>
          {done} of {techs.length} techs researched. Toggling a tech marks it complete;
          prerequisites are not checked.
        </CardDescription>
        <CardAction>
          <Button onClick={() => onEdit({ type: 'researchAll' })} disabled={done === techs.length}>
            <FlaskConical /> Research everything
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={(done / Math.max(techs.length, 1)) * 100} />
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
          <InputGroup className="w-64">
            <InputGroupInput
              placeholder="Search techs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="grid gap-3 @2xl/main:grid-cols-2 @5xl/main:grid-cols-3">
          {visible.map((tech) => (
            <FieldLabel key={tech.id} htmlFor={`tech-${tech.id}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{tech.name}</FieldTitle>
                  {tech.desc && (
                    <FieldDescription className="line-clamp-2">{tech.desc}</FieldDescription>
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
  )
}
