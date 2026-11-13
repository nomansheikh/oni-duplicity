import { useState } from 'react'
import { Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FieldDescription } from '@/components/ui/field'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { fmt, fmtMass, toCelsius } from '@/lib/format'
import type { Edit, MaterialView } from '@/worker/model'
import { BulkEdit } from './bulk-edit'
import { DeleteDialog } from './delete-dialog'
import { SpawnPanel } from './spawn-panel'
import { ItemsTable } from './items-table'
import { StateBadge } from './state-badge'
import { useMaterialItems } from './use-material-items'

export function MaterialSheet({
  material,
  revision,
  onClose,
  onEdit,
}: {
  material: MaterialView | null
  revision: number
  onClose: () => void
  onEdit: (edit: Edit) => Promise<void>
}) {
  const [temperature, setTemperature] = useState('')
  const [factor, setFactor] = useState('')
  const {
    items,
    selected,
    setSelected,
    confirm,
    setConfirm,
    stale,
    loose,
    deletable,
    targets,
    skipped,
    targetMass,
    deleteItems,
    toggle,
  } = useMaterialItems(material, revision, onEdit)

  return (
    <Sheet open={material !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-3xl">
        {material && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                {material.name} <StateBadge state={material.state} />
              </SheetTitle>
              <SheetDescription>
                {fmtMass(material.looseMass + material.storedMass)} in{' '}
                {material.looseCount + material.storedCount} places · average{' '}
                {fmt(toCelsius(material.temperature), 1)} °C
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4 pt-4">
              <BulkEdit
                material={material}
                onEdit={onEdit}
                temperature={temperature}
                setTemperature={setTemperature}
                factor={factor}
                setFactor={setFactor}
              />
              <SpawnPanel key={material.id} material={material} onEdit={onEdit} />
              <FieldDescription>
                Stored items keep their container; loose debris can be deleted.
              </FieldDescription>
              {loose.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border border-bad/60 bg-bad/10 p-3">
                  <span className="mr-auto flex items-center gap-2 type-label text-bad-text">
                    <TriangleAlert className="size-5" /> Loose debris
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={stale || selected.size === 0}
                    onClick={() => setConfirm('selected')}
                  >
                    <Trash2 /> Delete selected ({selected.size})
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={stale || deletable.length === 0}
                    onClick={() => setConfirm('all')}
                  >
                    <Trash2 /> Delete all loose ({deletable.length})
                  </Button>
                </div>
              )}
            </div>
            <ItemsTable
              items={items}
              deletable={deletable}
              selected={selected}
              stale={stale}
              onSelectAll={(on) =>
                setSelected(on ? new Set(deletable.map((i) => i.ref)) : new Set())
              }
              onToggle={toggle}
              onDelete={(chosen) => void deleteItems(chosen)}
              onEdit={onEdit}
            />
          </>
        )}
      </SheetContent>
      <DeleteDialog
        open={confirm !== null}
        count={targets.length}
        mass={targetMass}
        skipped={skipped}
        materialName={material?.name}
        disabled={stale || targets.length === 0}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          void deleteItems(targets)
          setConfirm(null)
        }}
      />
    </Sheet>
  )
}
