import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Catalogs, DuplicantEdit, DuplicantProfile, DuplicantView, Edit } from '@/worker/model'
import { BionicTab } from './BionicTab'
import { DuplicantSummaryCard } from './DuplicantSummaryCard'
import {
  AppearanceTab,
  AttributesTab,
  EffectsTab,
  HealthTab,
  InterestsTab,
  SkillsTab,
  TraitsTab,
} from './tabs'

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

  return (
    <div className="flex min-w-0 flex-col gap-4 md:gap-6">
      <DuplicantSummaryCard dupe={dupe} clipboard={clipboard} onCopy={onCopy} edit={edit} />

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
