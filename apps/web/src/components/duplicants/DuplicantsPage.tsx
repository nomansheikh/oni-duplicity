import { useState } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Catalogs, DuplicantProfile, DuplicantView, Edit } from '@/worker/model'
import { ColonyActions } from './ColonyActions'
import { PageHeader } from '../page-header'
import { DuplicantEditor } from './DuplicantEditor'
import { DuplicantRoster } from './DuplicantRoster'

export function DuplicantsPage({
  duplicants,
  catalogs,
  selectedId,
  onSelect,
  onEdit,
}: {
  duplicants: DuplicantView[]
  catalogs: Catalogs
  selectedId: string | undefined
  onSelect: (id: string) => void
  onEdit: (edit: Edit) => void
}) {
  const [clipboard, setClipboard] = useState<DuplicantProfile | null>(null)
  const selected = duplicants.find((d) => d.id === selectedId) ?? duplicants[0]

  return (
    <>
      <PageHeader
        title="Duplicants"
        description="Edit a duplicant's traits, skills, attributes, needs, effects and look. Pick one from the list."
        actions={<ColonyActions onEdit={onEdit} />}
        summary={[
          { label: 'Duplicants', value: duplicants.length },
          { label: 'Bionic', value: duplicants.filter((d) => d.isBionic).length },
        ]}
      />
      <div className="grid gap-4 @4xl/main:grid-cols-[22rem_1fr] md:gap-6">
        <DuplicantRoster
          duplicants={duplicants}
          selectedId={selected?.id}
          onSelect={onSelect}
          onEdit={onEdit}
        />
        {selected ? (
          <DuplicantEditor
            key={selected.id}
            dupe={selected}
            catalogs={catalogs}
            clipboard={clipboard}
            onCopy={setClipboard}
            onEdit={onEdit}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No duplicants</CardTitle>
              <CardDescription>This save has no duplicants to edit.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </>
  )
}
