import { TriangleAlert } from 'lucide-react'
import { FieldDescription, FieldGroup } from '@/components/ui/field'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { fmt } from '@/lib/format'
import {
  activeCycles,
  averagePerCycle,
  dormantCycles,
  eruptingSeconds,
  eruptionRate,
  SECONDS_PER_CYCLE,
} from '@/lib/geyser'
import type { Edit, GeyserView } from '@/worker/model'
import { GeyserInput } from './geyser-input'
import { Stat } from './stat'
import { TypeChanger } from './type-changer'

export function GeyserSheet({
  geyser,
  onClose,
  onEdit,
}: {
  geyser: GeyserView | null
  onClose: () => void
  onEdit: (edit: Edit) => void
}) {
  return (
    <Sheet open={geyser !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        {geyser && (
          <>
            <SheetHeader>
              <SheetTitle>{geyser.name}</SheetTitle>
              <SheetDescription>
                {geyser.typeName} at {geyser.x}, {geyser.y}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="While erupting" value={`${fmt(eruptionRate(geyser), 2)} kg/s`} />
                <Stat label="On average" value={`${fmt(averagePerCycle(geyser), 0)} kg/cycle`} />
                <Stat
                  label="Eruption"
                  value={`${fmt(eruptingSeconds(geyser), 0)} of ${fmt(geyser.iterationSeconds, 0)} s`}
                />
                <Stat
                  label="Active / dormant"
                  value={`${fmt(activeCycles(geyser))} / ${fmt(dormantCycles(geyser))} cycles`}
                />
              </div>
              {geyser.swapTargets.length > 0 && (
                <TypeChanger
                  key={geyser.id}
                  geyser={geyser}
                  onChange={(typeId) => {
                    onEdit({ type: 'setGeyserType', id: geyser.id, typeId })
                    onClose()
                  }}
                />
              )}
              {!geyser.matchesRolls && (
                <div className="flex gap-3 border border-warn bg-warn/10 px-4 py-3 type-small text-white">
                  <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warn" />
                  <span>
                    The saved values don&apos;t match this geyser&apos;s rolls, so something other
                    than the game changed them, probably a mod. Without that mod the game works them
                    out from the rolls again when it loads the save. Editing a value fixes its roll.
                  </span>
                </div>
              )}
              {geyser.ranges ? (
                <FieldGroup>
                  <GeyserInput
                    geyser={geyser}
                    field="scaledRate"
                    label="Output per active cycle"
                    unit="kg"
                    digits={1}
                    onEdit={onEdit}
                    description="Everything a cycle of activity emits; the rate while erupting follows from it."
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <GeyserInput
                      geyser={geyser}
                      field="scaledIterationLength"
                      label="Eruption cycle"
                      unit="s"
                      onEdit={onEdit}
                    />
                    <GeyserInput
                      geyser={geyser}
                      field="scaledIterationPercent"
                      label="Erupting"
                      unit="%"
                      digits={1}
                      scale={100}
                      onEdit={onEdit}
                    />
                    <GeyserInput
                      geyser={geyser}
                      field="scaledYearLength"
                      label="Activity cycle"
                      unit="cycles"
                      digits={1}
                      scale={1 / SECONDS_PER_CYCLE}
                      onEdit={onEdit}
                    />
                    <GeyserInput
                      geyser={geyser}
                      field="scaledYearPercent"
                      label="Active"
                      unit="%"
                      digits={1}
                      scale={100}
                      onEdit={onEdit}
                    />
                  </div>
                  <FieldDescription>
                    Each value stays within what the game can roll for this type: the game stores
                    the roll and works the value out from it when it loads the save. Not yet
                    verified in game.
                  </FieldDescription>
                </FieldGroup>
              ) : (
                <p className="type-small text-muted-foreground">
                  This geyser type isn&apos;t known to Duplicity, so only its name can be changed.
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
