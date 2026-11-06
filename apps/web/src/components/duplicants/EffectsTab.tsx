import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item'
import { effectGroupLabels } from '@oni-duplicity/game-data'
import { effectDetail, groupEffects } from '@/lib/effects'
import type { DuplicantView, Named } from '@/worker/model'
import { NumberField } from '../common'
import { EffectModifiers } from './EffectModifiers'
import { EffectPicker } from './EffectPicker'
import { Panel, Nothing, type EditFn } from './panel'

// --- Effects ---------------------------------------------------------------------------------

export function EffectsTab({
  dupe,
  catalog,
  edit,
}: {
  dupe: DuplicantView
  catalog: Named[]
  edit: EditFn
}) {
  return (
    <Panel
      title="Effects"
      description="Temporary buffs and debuffs, with the cycles they have left."
      action={
        <EffectPicker
          catalog={catalog}
          exclude={dupe.effects.map((e) => e.id)}
          onSelect={(effectId) => edit({ type: 'addEffect', effectId, cycles: 1 })}
        />
      }
    >
      {dupe.effects.length === 0 ? (
        <Nothing
          title="No active effects"
          description="Add a buff or debuff with the button above."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groupEffects(dupe.effects).map(({ group, items }) => (
            <section key={group} className="flex flex-col gap-2">
              <h3 className="type-label text-muted-foreground">
                {effectGroupLabels[group]} ({items.length})
              </h3>
              <ItemGroup className="gap-2">
                {items.map((effect) => (
                  <Item key={effect.id} variant="outline">
                    <ItemContent>
                      <ItemTitle>{effect.name}</ItemTitle>
                      {effect.desc && <ItemDescription>{effect.desc}</ItemDescription>}
                      <EffectModifiers modifiers={effectDetail(effect.id).modifiers} />
                    </ItemContent>
                    <ItemActions>
                      <NumberField
                        label={`${effect.name} cycles left`}
                        value={effect.cyclesRemaining}
                        digits={2}
                        min={0}
                        unit="cycles"
                        className="w-40"
                        onCommit={(cycles) =>
                          edit({ type: 'setEffectCycles', effectId: effect.id, cycles })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${effect.name}`}
                        onClick={() => edit({ type: 'removeEffect', effectId: effect.id })}
                      >
                        <X />
                      </Button>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            </section>
          ))}
        </div>
      )}
    </Panel>
  )
}
