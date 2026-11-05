import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmt } from '@/lib/format'
import type { StoryQuestView, StoryState, StoryView } from '@/worker/model'

const STATE_LABELS: Record<StoryState, string> = {
  retrofitted: 'Added to an existing save',
  notStarted: 'Not started',
  discovered: 'Discovered',
  inProgress: 'In progress',
  complete: 'Complete',
  unknown: 'Unknown state',
}

const QUEST_LABELS: Record<StoryQuestView['state'], string> = {
  notStarted: 'Not started',
  inProgress: 'In progress',
  completed: 'Completed',
  unknown: 'Unknown state',
}

function stateVariant(state: StoryState) {
  if (state === 'complete') return 'default'
  if (state === 'inProgress' || state === 'discovered') return 'secondary'
  return 'outline'
}

function Timeline({ cycles }: { cycles: StoryView['cycles'] }) {
  const parts = [
    ['Added', cycles.retrofitted],
    ['Discovered', cycles.discovered],
    ['Started', cycles.inProgress],
    ['Completed', cycles.completed],
  ].filter((p): p is [string, number] => typeof p[1] === 'number')
  if (parts.length === 0) return <span className="text-muted-foreground">-</span>
  return (
    <span className="text-muted-foreground">
      {parts.map(([label, cycle]) => `${label} cycle ${fmt(Math.floor(cycle))}`).join(' · ')}
    </span>
  )
}

export function StoriesPage({ stories }: { stories: StoryView[] }) {
  if (stories.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No story traits</EmptyTitle>
          <EmptyDescription>
            This save has no story traits, or was made before they existed.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Story traits</CardTitle>
          <CardDescription>Where each story trait stands in this save. Read only.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Story</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Asteroid</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Cycles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stories.map((story) => (
                <TableRow key={story.id}>
                  <TableCell className="font-medium">{story.name}</TableCell>
                  <TableCell>
                    <Badge variant={stateVariant(story.state)}>{STATE_LABELS[story.state]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{story.world ?? '-'}</TableCell>
                  <TableCell className="space-y-1">
                    {story.activated !== undefined && (
                      <div className="text-muted-foreground">
                        Machine {story.activated ? 'activated' : 'not activated'}
                      </div>
                    )}
                    {story.quests.map((quest) => (
                      <div key={quest.id} className="flex items-center gap-2">
                        <span>{quest.name}</span>
                        <Badge variant={quest.state === 'completed' ? 'default' : 'outline'}>
                          {QUEST_LABELS[quest.state]}
                        </Badge>
                        <span className="text-muted-foreground">{quest.goal}</span>
                      </div>
                    ))}
                    {story.activated === undefined && story.quests.length === 0 && (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Timeline cycles={story.cycles} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
