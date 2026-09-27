import type { ReactNode } from 'react'
import { Activity, Droplets, Timer, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { Switch } from '@/components/ui/switch'
import { DLC_NAMES, fmt } from '@/lib/format'
import type { DuplicantView, Edit, GeyserView, Summary } from '@/worker/model'
import { CommitInput } from './common'

function StatCard({
  label,
  value,
  icon,
  footer,
  detail,
}: {
  label: string
  value: ReactNode
  icon: ReactNode
  footer: ReactNode
  detail: ReactNode
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">{icon}</Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 font-medium">{footer}</div>
        <div className="text-muted-foreground">{detail}</div>
      </CardFooter>
    </Card>
  )
}

function average(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

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
  const amount = (d: DuplicantView, id: string) => d.amounts.find((a) => a.id === id)?.value
  const stress = average(duplicants.map((d) => amount(d, 'Stress') ?? 0))
  const bionic = duplicants.filter((d) => d.isBionic).length
  const outputKgPerCycle = geysers.reduce((sum, g) => {
    const total = g.activeCycles + g.dormancyCycles
    if (g.iterationSeconds <= 0 || total <= 0) return sum
    return (
      sum +
      (g.rate * (g.eruptionSeconds / g.iterationSeconds) * (g.activeCycles / total) * 600) / 1000
    )
  }, 0)

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
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
          footer={
            stress > 60
              ? 'Colony is struggling'
              : stress > 30
                ? 'Keep an eye on morale'
                : 'Colony is calm'
          }
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
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="sandbox">Sandbox mode</FieldLabel>
                  <FieldDescription>Unlocks the sandbox tools in game.</FieldDescription>
                </FieldContent>
                <Switch
                  id="sandbox"
                  checked={summary.sandbox}
                  onCheckedChange={(enabled) => onEdit({ type: 'setSandbox', enabled })}
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
                  <ItemDescription className="font-mono text-xs">
                    {summary.clusterId || '—'}
                  </ItemDescription>
                </ItemContent>
              </Item>
              <Item variant="outline" size="sm">
                <ItemContent>
                  <ItemTitle>Content</ItemTitle>
                  <div className="flex flex-wrap gap-1">
                    {summary.dlcIds.length === 0 && <Badge variant="secondary">Base game</Badge>}
                    {summary.dlcIds.map((id) => (
                      <Badge key={id} variant="secondary">
                        {DLC_NAMES[id] ?? id}
                      </Badge>
                    ))}
                  </div>
                </ItemContent>
              </Item>
            </ItemGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
