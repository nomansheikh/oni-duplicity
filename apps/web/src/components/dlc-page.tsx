import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { EmptyState } from './empty-state'
import { saveClient } from '@/lib/save-client'
import type { DlcPageView } from '@/worker/dlc'
import type { Edit } from '@/worker/model'
import { DemoliorCard } from './dlc-demolior-card'
import { GeothermalCard, MixingCard } from './dlc-tables'
import { PageHeader } from './page-header'

export function DlcPage({ revision, onEdit }: { revision: number; onEdit: (edit: Edit) => void }) {
  const [view, setView] = useState<DlcPageView | null>(null)

  useEffect(() => {
    let cancelled = false
    void saveClient.dlc().then((next) => !cancelled && setView(next))
    return () => {
      cancelled = true
    }
  }, [revision])

  if (!view) return null
  const { demolior, mixing, geothermal } = view
  if (!demolior && !geothermal && !(mixing && view.dlcIds.length > 0)) {
    return (
      <div className="flex flex-col gap-4 md:gap-6">
        <PageHeader
          title="Content"
          description="What this save was generated with: the Prehistoric Planet impactor, the Frosty Planet geothermal quest and the world mixing chosen at world generation."
        />
        <EmptyState
          icon={Package}
          title="Nothing DLC-specific"
          description="Sections appear here for the Prehistoric Planet impactor, the Frosty Planet geothermal quest, and the world mixing chosen at world generation."
        />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="Content"
        description="What this save was generated with: the Prehistoric Planet impactor, the Frosty Planet geothermal quest and the world mixing chosen at world generation."
      />
      {demolior && <DemoliorCard demolior={demolior} onEdit={onEdit} />}
      {geothermal && <GeothermalCard geothermal={geothermal} />}
      {mixing && view.dlcIds.length > 0 && <MixingCard mixing={mixing} />}
    </div>
  )
}
