import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item'
import { Switch } from '@/components/ui/switch'
import { findTraitInfo, type TraitCategory } from '@oni-duplicity/game-data'
import { heldConflicts } from '@/lib/traits'
import type { DuplicantView, Named } from '@/worker/model'
import { TraitCategoryBadge, TraitPicker } from './TraitPicker'
import { Panel, Nothing, type EditFn } from './panel'

function TraitName({ name, category }: { name: string; category: TraitCategory | undefined }) {
  const polar = category === 'positive' || category === 'negative'
  return (
    <>
      <Badge
        variant={category === 'positive' ? 'good' : category === 'negative' ? 'bad' : 'secondary'}
      >
        {name}
      </Badge>
      {!polar && <TraitCategoryBadge category={category} />}
    </>
  )
}

// --- Traits -----------------------------------------------------------------------

export function TraitsTab({
  dupe,
  catalog,
  edit,
}: {
  dupe: DuplicantView
  catalog: Named[]
  edit: EditFn
}) {
  const conflicts = heldConflicts(dupe, catalog)
  return (
    <Panel
      title="Traits"
      description="Traits are applied when the game loads the save. Traits the model or the save's DLC rule out are not offered, and clashing ones are blocked."
      action={
        <TraitPicker
          subject={dupe}
          catalog={catalog}
          onSelect={(traitId) => edit({ type: 'addTrait', traitId })}
        />
      }
    >
      {dupe.traits.length === 0 ? (
        <Nothing title="No traits" description="Add one with the button above." />
      ) : (
        <ItemGroup className="grid gap-2 @3xl/main:grid-cols-2">
          {dupe.traits.map((trait) => (
            <Item key={trait.id} variant="outline" data-trait={trait.id}>
              <ItemContent>
                <ItemTitle className="type-h3">
                  <TraitName name={trait.name} category={findTraitInfo(trait.id)?.category} />
                </ItemTitle>
                {trait.desc && (
                  <ItemDescription className="type-small whitespace-pre-line">
                    {trait.desc}
                  </ItemDescription>
                )}
                {conflicts.has(trait.id) && (
                  <p className="type-caption text-warn">
                    {conflicts.get(trait.id)} The save has it, so it is kept.
                  </p>
                )}
              </ItemContent>
              <ItemActions>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${trait.name}`}
                  onClick={() => edit({ type: 'removeTrait', traitId: trait.id })}
                >
                  <X />
                </Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}
    </Panel>
  )
}

// --- Interests ----------------------------------------------------------------------

export function InterestsTab({ dupe, edit }: { dupe: DuplicantView; edit: EditFn }) {
  return (
    <Panel
      title="Interests"
      description="Interests raise related attributes and reduce stress from that work."
    >
      <FieldGroup className="grid gap-3 @2xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        {dupe.interests.map((interest) => {
          const id = `${dupe.id}-interest-${interest.hash}`
          return (
            <FieldLabel key={interest.hash} htmlFor={id}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{interest.name}</FieldTitle>
                  {interest.desc && (
                    <FieldDescription className="line-clamp-2">{interest.desc}</FieldDescription>
                  )}
                </FieldContent>
                <Switch
                  id={id}
                  checked={interest.active}
                  onCheckedChange={(active) =>
                    edit({ type: 'setInterest', hash: interest.hash, active })
                  }
                />
              </Field>
            </FieldLabel>
          )
        })}
      </FieldGroup>
    </Panel>
  )
}
