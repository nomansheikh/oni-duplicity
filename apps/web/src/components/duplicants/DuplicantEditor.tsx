import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fmt, humanize } from '@/lib/format'
import type { Catalogs, DuplicantEdit, DuplicantView, Edit } from '@/worker/model'
import { CommitInput, DuplicantAvatar } from '../common'
import {
  AppearanceTab,
  AttributesTab,
  EffectsTab,
  HealthTab,
  InterestsTab,
  SkillsTab,
  TraitsTab,
} from './tabs'

const GENDERS = [
  ['MALE', 'Male'],
  ['FEMALE', 'Female'],
  ['NB', 'Non-binary'],
] as const

function Meter({
  label,
  value,
  max,
  text,
}: {
  label: string
  value: number
  max: number
  text: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{text}</span>
      </div>
      <Progress value={Math.min(100, (value / max) * 100)} className="h-1.5" />
    </div>
  )
}

export function DuplicantEditor({
  dupe,
  catalogs,
  onEdit,
}: {
  dupe: DuplicantView
  catalogs: Catalogs
  onEdit: (edit: Edit) => void
}) {
  const edit = (change: DuplicantEdit) => onEdit({ ...change, id: dupe.id } as Edit)
  const amount = (id: string) => dupe.amounts.find((a) => a.id === id)?.value ?? 0
  const mastered = dupe.skills.filter((s) => s.mastered).length

  return (
    <div className="flex min-w-0 flex-col gap-4 md:gap-6">
      <Card>
        <CardHeader className="flex items-center gap-4">
          <DuplicantAvatar name={dupe.name} className="size-14 text-lg" />
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-2xl">{dupe.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {dupe.personality.name}
              {dupe.personality.desc && ` · ${dupe.personality.desc}`}
            </CardDescription>
          </div>
          <CardAction className="flex gap-1">
            {dupe.isBionic && <Badge>Bionic</Badge>}
            {dupe.hat && (
              <Badge variant="outline">{humanize(dupe.hat.replace(/^hat_role_/, ''))} hat</Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-6">
          <FieldGroup className="grid gap-4 @2xl/main:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`${dupe.id}-name`}>Name</FieldLabel>
              <CommitInput
                id={`${dupe.id}-name`}
                value={dupe.name}
                onCommit={(name) => edit({ type: 'setDuplicantName', name })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${dupe.id}-gender`}>Gender</FieldLabel>
              <Select
                value={dupe.gender}
                onValueChange={(gender) => edit({ type: 'setGender', gender })}
              >
                <SelectTrigger id={`${dupe.id}-gender`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <div className="grid gap-4 @2xl/main:grid-cols-4">
            <Meter
              label="Stress"
              value={amount('Stress')}
              max={100}
              text={`${fmt(amount('Stress'), 0)}%`}
            />
            <Meter
              label="Health"
              value={amount('HitPoints')}
              max={100}
              text={fmt(amount('HitPoints'), 0)}
            />
            <Meter
              label="Calories"
              value={amount('Calories') / 1000}
              max={4000}
              text={`${fmt(amount('Calories') / 1000, 0)} kcal`}
            />
            <Meter
              label="Skills"
              value={mastered}
              max={Math.max(1, dupe.skills.length)}
              text={`${mastered} / ${dupe.skills.length}`}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="traits" className="gap-4">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="traits">Traits</TabsTrigger>
          <TabsTrigger value="interests">Interests</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="health">
            {dupe.isBionic ? 'Health & systems' : 'Health & needs'}
          </TabsTrigger>
          <TabsTrigger value="effects">Effects</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        <TabsContent value="traits">
          <TraitsTab dupe={dupe} catalog={catalogs.traits} edit={edit} />
        </TabsContent>
        <TabsContent value="interests">
          <InterestsTab dupe={dupe} edit={edit} />
        </TabsContent>
        <TabsContent value="attributes">
          <AttributesTab dupe={dupe} edit={edit} />
        </TabsContent>
        <TabsContent value="skills">
          <SkillsTab dupe={dupe} edit={edit} />
        </TabsContent>
        <TabsContent value="health">
          <HealthTab dupe={dupe} edit={edit} />
        </TabsContent>
        <TabsContent value="effects">
          <EffectsTab dupe={dupe} catalog={catalogs.effects} edit={edit} />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceTab dupe={dupe} edit={edit} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
