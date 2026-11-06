import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { humanize } from '@/lib/format'
import type { DuplicantView } from '@/worker/model'
import { Hint, NumberField } from '../common'
import { Panel, type EditFn } from './panel'

// --- Attributes -----------------------------------------------------------------------

export function AttributesTab({ dupe, edit }: { dupe: DuplicantView; edit: EditFn }) {
  const set = (attributeId: string, level: number) =>
    edit({ type: 'setAttributeLevel', attributeId, level: Math.max(0, Math.round(level)) })
  return (
    <Panel title="Attributes" description="Base levels before traits and effects. There is no cap.">
      <div className="grid gap-2 @2xl/main:grid-cols-2 @6xl/main:grid-cols-3">
        {dupe.attributes.map((attribute) => (
          <div
            key={attribute.id}
            className="well grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1.5 pr-1.5 pl-3"
          >
            <Hint desc={attribute.desc}>
              <span className="type-label min-w-0 leading-tight">{attribute.name}</span>
            </Hint>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                aria-label={`Lower ${attribute.name}`}
                disabled={attribute.level <= 0}
                onClick={() => set(attribute.id, attribute.level - 1)}
              >
                <Minus />
              </Button>
              <NumberField
                label={attribute.name}
                value={attribute.level}
                min={0}
                className="w-16"
                onCommit={(level) => set(attribute.id, level)}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label={`Raise ${attribute.name}`}
                onClick={() => set(attribute.id, attribute.level + 1)}
              >
                <Plus />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// --- Skills -----------------------------------------------------------------------------

export function SkillsTab({ dupe, edit }: { dupe: DuplicantView; edit: EditFn }) {
  const groups = new Map<string, typeof dupe.skills>()
  for (const skill of dupe.skills)
    groups.set(skill.group, [...(groups.get(skill.group) ?? []), skill])

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Panel title="Experience" description="Skill points are earned from total experience.">
        <Field className="max-w-xs">
          <FieldLabel>Total experience</FieldLabel>
          <NumberField
            label="Total experience"
            value={dupe.experience}
            min={0}
            unit="XP"
            className="w-48"
            onCommit={(experience) => edit({ type: 'setExperience', experience })}
          />
        </Field>
      </Panel>
      <Panel
        title="Skills"
        description="Skills from content packs this save doesn't use are hidden."
      >
        <div className="grid gap-4 @3xl/main:grid-cols-2 @6xl/main:grid-cols-3">
          {[...groups].map(([group, skills]) => (
            <FieldSet key={group} className="well p-4">
              <FieldLegend variant="label" className="type-h3">
                {humanize(group)}
              </FieldLegend>
              <FieldGroup className="gap-3">
                {skills.map((skill) => {
                  const id = `${dupe.id}-skill-${skill.id}`
                  return (
                    <Field key={skill.id} orientation="horizontal">
                      <FieldLabel
                        htmlFor={id}
                        className="type-body font-normal normal-case tracking-normal"
                      >
                        {skill.name}
                      </FieldLabel>
                      <Switch
                        id={id}
                        checked={skill.mastered}
                        onCheckedChange={(mastered) =>
                          edit({ type: 'setSkillMastered', skillId: skill.id, mastered })
                        }
                      />
                    </Field>
                  )
                })}
              </FieldGroup>
            </FieldSet>
          ))}
        </div>
      </Panel>
    </div>
  )
}
