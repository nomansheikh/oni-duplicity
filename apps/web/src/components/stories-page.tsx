import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { fmt } from '@/lib/format'
import { PageHeader } from './page-header'
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
  if (state === 'complete') return 'good'
  if (state === 'inProgress') return 'warn'
  if (state === 'discovered') return 'info'
  return 'outline'
}

function Timeline({ cycles }: { cycles: StoryView['cycles'] }) {
  const steps: [string, number | undefined][] = [
    ['Added', cycles.retrofitted],
    ['Discovered', cycles.discovered],
    ['Started', cycles.inProgress],
    ['Completed', cycles.completed],
  ]
  if (steps.every(([, cycle]) => typeof cycle !== 'number')) {
    return <span className="type-small text-muted-foreground">No cycles recorded</span>
  }
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-3">
      {steps.map(([label, cycle]) => {
        const reached = typeof cycle === 'number'
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-hidden
              className={
                reached
                  ? 'size-3 shrink-0 border border-ink bg-gold'
                  : 'size-3 shrink-0 border border-border bg-inset'
              }
            />
            <span className="flex flex-col gap-0.5">
              <span className="type-caption text-muted-foreground">{label}</span>
              <span className={reached ? 'type-label tabular-nums' : 'type-small text-fg-3'}>
                {reached ? `cycle ${fmt(Math.floor(cycle))}` : '-'}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function StoryCard({ story }: { story: StoryView }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{story.name}</CardTitle>
        <CardAction>
          <Badge variant={stateVariant(story.state)}>{STATE_LABELS[story.state]}</Badge>
        </CardAction>
        <CardDescription>{story.world ?? 'No asteroid recorded'}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {(story.activated !== undefined || story.quests.length > 0) && (
          <div className="well flex flex-col gap-2 p-3">
            {story.activated !== undefined && (
              <div className="type-body">
                Machine {story.activated ? 'activated' : 'not activated'}
              </div>
            )}
            {story.quests.map((quest) => (
              <div key={quest.id} className="flex flex-wrap items-center gap-2">
                <span className="type-body">{quest.name}</span>
                <Badge variant={quest.state === 'completed' ? 'good' : 'outline'}>
                  {QUEST_LABELS[quest.state]}
                </Badge>
                <span className="type-small text-muted-foreground">{quest.goal}</span>
              </div>
            ))}
          </div>
        )}
        <Timeline cycles={story.cycles} />
      </CardContent>
    </Card>
  )
}

export function StoriesPage({ stories }: { stories: StoryView[] }) {
  if (stories.length === 0) {
    return (
      <div className="flex flex-col gap-4 md:gap-6">
        <PageHeader
          title="Stories"
          status="read-only"
          description="Where each story trait stands in this save."
        />
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No story traits</EmptyTitle>
            <EmptyDescription>
              This save has no story traits, or was made before they existed.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="Stories"
        status="read-only"
        description="Where each story trait stands in this save."
        summary={[
          { label: 'Story traits', value: stories.length },
          { label: 'Completed', value: stories.filter((s) => s.state === 'complete').length },
        ]}
      />
      <div className="grid gap-4 @3xl/main:grid-cols-2 md:gap-6">
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    </div>
  )
}
