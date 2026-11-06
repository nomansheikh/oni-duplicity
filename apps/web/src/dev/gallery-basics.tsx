import { Badge, type badgeVariants } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SettingsIcon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Row, Section } from './gallery-parts'

type BadgeVariant = NonNullable<Parameters<typeof badgeVariants>[0]>['variant']

const BADGES: Record<string, BadgeVariant[]> = {
  Base: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link', 'bare'],
  Status: ['good', 'warn', 'bad', 'info'],
  Resources: ['oxygen', 'water', 'food', 'power', 'metal', 'plant', 'critter', 'geyser', 'dlc'],
  Elements: ['gas', 'liquid', 'solid', 'vacuum'],
  Stat: ['stat'],
}

export function BasicsSections() {
  return (
    <>
      <Section title="Type scale">
        {(
          [
            ['type-display', '2.5rem / 40px', 'Display: Oxygen Not Included'],
            ['type-h1', '2rem / 32px', 'H1: Duplicants'],
            ['type-h2', '1.5rem / 24px', 'H2: Vitals and stress'],
            ['type-h3', '1.25rem / 20px', 'H3: Attributes'],
            ['type-title-bar', '1.375rem / 22px', 'Title bar: Skills'],
            [
              'type-body',
              '1rem / 16px',
              'Body: Meep is carrying 19 kg of Oxylite to the storage bin.',
            ],
            ['type-label', '1rem / 16px', 'Label: Morale'],
            ['type-small', '0.9375rem / 15px', 'Small: Secondary text and descriptions.'],
            ['type-caption', '0.8125rem / 13px', 'Caption: 14 / 20 kg, hints and units.'],
          ] as const
        ).map(([cls, size, sample]) => (
          <div
            key={cls}
            className="flex w-full flex-wrap items-baseline gap-x-4 border-b border-ink py-1"
          >
            <code className="w-40 shrink-0 font-mono text-xs text-fg-3">{cls}</code>
            <code className="w-36 shrink-0 font-mono text-xs text-fg-3">{size}</code>
            <span className={cls}>{sample}</span>
          </div>
        ))}
      </Section>

      <Section title="Buttons">
        {(
          ['default', 'secondary', 'outline', 'accent', 'ghost', 'destructive', 'link'] as const
        ).map((v) => (
          <Row key={v} label={v}>
            <Button variant={v}>{v}</Button>
            <Button variant={v} size="sm">
              Small
            </Button>
            <Button variant={v} size="xs">
              Tiny
            </Button>
            <Button variant={v} size="lg">
              Large
            </Button>
            <Button variant={v} size="icon" aria-label="settings">
              <SettingsIcon />
            </Button>
            <Button variant={v} disabled>
              Disabled
            </Button>
          </Row>
        ))}
      </Section>

      <Section title="Page header">
        <div className="@container/main flex flex-col gap-4">
          <PageHeader
            title="Geysers"
            status="experimental"
            description="Output per cycle and eruption timing. Open one to change it."
            actions={<Button>Bulk action</Button>}
            summary={[
              { label: 'Geysers', value: 8 },
              { label: 'Erupting now', value: 6 },
              { label: 'Avg output', value: '13,025 kg', hint: 'per cycle' },
            ]}
          />
          <PageHeader
            title="Stories"
            status="read-only"
            description="Where each story trait stands in this save."
          />
        </div>
      </Section>

      <Section title="Card">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Panel with title bar</CardTitle>
              <CardAction>
                <Badge variant="good">3 changes</Badge>
              </CardAction>
              <CardDescription>Optional description under the title</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="well">A well block inside the panel</div>
              <div className="inset-layer p-2">An inset layer</div>
            </CardContent>
          </Card>
          <Card variant="well">
            <CardHeader>
              <CardTitle>Well variant</CardTitle>
            </CardHeader>
            <CardContent>No mauve bar; a darker section block.</CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">Overview</TabsTrigger>
            <TabsTrigger value="b">
              Duplicants <span data-slot="tab-count">12</span>
            </TabsTrigger>
            <TabsTrigger value="c">
              Critters <span data-slot="tab-count">5</span>
            </TabsTrigger>
            <TabsTrigger value="d" disabled>
              Disabled
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs defaultValue="a">
          <TabsList variant="line">
            <TabsTrigger value="a">Traits</TabsTrigger>
            <TabsTrigger value="b">Attributes</TabsTrigger>
          </TabsList>
        </Tabs>
      </Section>

      <Section title="Badges">
        {Object.entries(BADGES).map(([group, list]) => (
          <Row key={group} label={group}>
            {list.map((v) => (
              <Badge key={v} variant={v}>
                {v === 'stat' ? '12.5 kcal' : v}
              </Badge>
            ))}
          </Row>
        ))}
      </Section>
    </>
  )
}
