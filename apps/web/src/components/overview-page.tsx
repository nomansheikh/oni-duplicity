import { useEffect, useState } from 'react'
import { Activity, Droplets, ShieldCheck, Timer, TriangleAlert, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { meterTone, Progress } from '@/components/ui/progress'
import { averagePerCycle } from '@/lib/geyser'
import { fmt } from '@/lib/format'
import { saveClient } from '@/lib/save-client'
import type { DemoliorView } from '@/worker/dlc'
import type { DuplicantView, Edit, GeyserView, Summary } from '@/worker/model'
import { CommitInput } from './common'
import { DlcBadges } from './dlc-badge'
import { PageHeader } from './page-header'
import { EmptyState } from './empty-state'
import { MAX_ATTENTION, STRESS_TEXT, attentionItems, average } from './overview-attention'
import { StatCard } from './overview-stat-card'

export function OverviewPage({
  summary,
  duplicants,
  geysers,
  onEdit,
}: {
  summary: Summary
  duplicants: DuplicantView[]
  geysers: GeyserView[]
  onEdit: (edit: Edit) => void
}) {
  const [demolior, setDemolior] = useState<DemoliorView | null>(null)
  useEffect(() => {
    let cancelled = false
    void saveClient.dlc().then((view) => !cancelled && setDemolior(view.demolior))
    return () => {
      cancelled = true
    }
  }, [duplicants]) // the views are rebuilt after every edit, so the countdown is read again
  const attention = attentionItems(summary, duplicants, demolior)
  const shown = attention.slice(0, MAX_ATTENTION)

  const amount = (d: DuplicantView, id: string) => d.amounts.find((a) => a.id === id)?.value
  const stress = average(duplicants.map((d) => amount(d, 'Stress') ?? 0))
  const stressTone = meterTone('stress', stress)
  const bionic = duplicants.filter((d) => d.isBionic).length
  const outputKgPerCycle = geysers.reduce((sum, g) => sum + averagePerCycle(g), 0)

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="Overview"
        description="The state of your colony and what is worth a look. Everything else is in the tabs above."
      />
      <Card data-testid="needs-attention">
        <CardHeader>
          <CardTitle>Needs attention</CardTitle>
          <CardDescription>
            {attention.length > shown.length
              ? `Showing ${shown.length} of ${attention.length}.`
              : 'Stressed or hurt duplicants, an incoming impact and save-level warnings.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shown.length === 0 ? (
            <EmptyState
              size="compact"
              icon={ShieldCheck}
              title="All clear"
              description="Nothing needs attention. Everyone is fed, rested and mostly sane."
            />
          ) : (
            <ItemGroup className="gap-2">
              {shown.map((item) => (
                <Item key={item.id} variant="outline" size="sm">
                  <ItemContent className="flex-row items-center gap-3">
                    <Badge variant={item.tone}>
                      {item.tone === 'info' ? null : <TriangleAlert />} {item.label}
                    </Badge>
                    <ItemDescription className="line-clamp-none">{item.text}</ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          )}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <StatCard
          label="Cycles survived"
          value={summary.cycles}
          icon={<Timer />}
          footer={summary.isAutoSave ? 'From an autosave' : 'Manual save'}
          detail={`Save version ${summary.version}`}
        />
        <StatCard
          label="Duplicants"
          value={duplicants.length}
          icon={<Users />}
          footer={bionic > 0 ? `${bionic} bionic` : 'No bionic duplicants'}
          detail={`${duplicants.reduce((n, d) => n + d.skills.filter((s) => s.mastered).length, 0)} skills mastered`}
        />
        <StatCard
          label="Average stress"
          value={`${fmt(stress, 0)}%`}
          icon={<Activity />}
          meter={
            <Progress
              variant="blocks"
              value={stress}
              tone={stressTone}
              aria-label="Average stress"
            />
          }
          footer={STRESS_TEXT[stressTone]}
          detail="Across all duplicants"
        />
        <StatCard
          label="Geysers"
          value={geysers.length}
          icon={<Droplets />}
          footer={`${fmt(outputKgPerCycle, 0)} kg per cycle on average`}
          detail="Combined long-term output"
        />
      </div>

      <div className="grid gap-4 @4xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Colony</CardTitle>
            <CardDescription>The colony name is also used for the downloaded file.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="colony-name">Colony name</FieldLabel>
                <CommitInput
                  id="colony-name"
                  value={summary.baseName}
                  onCommit={(name) => onEdit({ type: 'setColonyName', name })}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Game</CardTitle>
            <CardDescription>What this save was made with.</CardDescription>
          </CardHeader>
          <CardContent>
            <ItemGroup className="gap-2">
              <Item variant="outline" size="sm">
                <ItemContent>
                  <ItemTitle>Save version</ItemTitle>
                  <ItemDescription>
                    {summary.version} · build {summary.buildVersion}
                  </ItemDescription>
                </ItemContent>
              </Item>
              <Item variant="outline" size="sm">
                <ItemContent>
                  <ItemTitle>Cluster</ItemTitle>
                  <ItemDescription className="type-caption font-mono">
                    {summary.clusterId || '—'}
                  </ItemDescription>
                </ItemContent>
              </Item>
              <Item variant="outline" size="sm">
                <ItemContent>
                  <ItemTitle>Content</ItemTitle>
                  <DlcBadges ids={summary.dlcIds} />
                </ItemContent>
              </Item>
            </ItemGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
