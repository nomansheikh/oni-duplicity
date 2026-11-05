import {
  Award,
  BatteryCharging,
  Brain,
  Droplet,
  Heart,
  Moon,
  Utensils,
  type LucideIcon,
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Item, ItemContent, ItemMedia } from '@/components/ui/item'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { humanize, portraitParts } from '@/lib/format'
import type { Catalogs, DuplicantEdit, DuplicantProfile, DuplicantView, Edit } from '@/worker/model'
import { BionicTab } from './BionicTab'
import { ProfileActions } from './ProfileActions'
import { CommitInput, DuplicantAvatar } from '../common'
import {
  Vital,
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

const VITALS: [id: string, Icon: LucideIcon][] = [
  ['HitPoints', Heart],
  ['Stress', Brain],
  ['Calories', Utensils],
  ['Stamina', Moon],
  ['BionicInternalBattery', BatteryCharging],
  ['BionicOil', Droplet],
]

export function DuplicantEditor({
  dupe,
  catalogs,
  clipboard,
  onCopy,
  onEdit,
}: {
  dupe: DuplicantView
  catalogs: Catalogs
  clipboard: DuplicantProfile | null
  onCopy: (profile: DuplicantProfile) => void
  onEdit: (edit: Edit) => void
}) {
  const edit = (change: DuplicantEdit) => onEdit({ ...change, id: dupe.id } as Edit)
  const vitals = VITALS.flatMap(([id, Icon]) => {
    const amount = dupe.amounts.find((a) => a.id === id)
    return amount ? [{ amount, Icon }] : []
  })
  const mastered = dupe.skills.filter((s) => s.mastered).length

  return (
    <div className="flex min-w-0 flex-col gap-4 md:gap-6">
      <Card>
        <CardHeader className="flex items-center gap-4">
          <DuplicantAvatar
            name={dupe.name}
            parts={portraitParts(dupe.appearance)}
            size={64}
            className="type-h3"
          />
          <div className="min-w-0 space-y-1">
            <CardTitle className="type-h1">{dupe.name}</CardTitle>
            <CardDescription className="type-small">
              Age {dupe.age} {dupe.age === 1 ? 'cycle' : 'cycles'} · arrived in cycle{' '}
              {Math.round(dupe.arrivalTime) + 1}
            </CardDescription>
            <CardDescription className="type-small line-clamp-2">
              {dupe.personality.name}
              {dupe.personality.desc && ` · ${dupe.personality.desc}`}
            </CardDescription>
          </div>
          <CardAction className="flex items-center gap-1">
            {dupe.isBionic && <Badge variant="info">Bionic</Badge>}
            {dupe.hat && (
              <Badge variant="outline">{humanize(dupe.hat.replace(/^hat_role_/, ''))} hat</Badge>
            )}
            <ProfileActions
              dupe={dupe}
              clipboard={clipboard}
              onCopy={onCopy}
              onApply={(profile, sections) => edit({ type: 'applyProfile', profile, sections })}
            />
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
          <div className="well flex flex-col gap-1 p-2">
            {vitals.map(({ amount, Icon }) => (
              <Vital key={amount.id} amount={amount} Icon={Icon} />
            ))}
            <Item variant="need" data-vital="Skills">
              <ItemMedia variant="icon">
                <Award />
              </ItemMedia>
              <ItemContent className="gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="type-body">Skills</span>
                  <span className="type-body text-white tabular-nums">
                    {mastered} / {dupe.skills.length}
                  </span>
                </div>
                <Progress
                  variant="xp"
                  value={mastered}
                  max={Math.max(1, dupe.skills.length)}
                  valueLabel={`${mastered} / ${dupe.skills.length}`}
                />
              </ItemContent>
            </Item>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="traits" className="gap-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="traits">Traits</TabsTrigger>
          <TabsTrigger value="interests">Interests</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="health">
            {dupe.isBionic ? 'Health & systems' : 'Health & needs'}
          </TabsTrigger>
          {dupe.isBionic && <TabsTrigger value="bionic">Boosters & power</TabsTrigger>}
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
        {dupe.isBionic && (
          <TabsContent value="bionic">
            <BionicTab dupeId={dupe.id} />
          </TabsContent>
        )}
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
