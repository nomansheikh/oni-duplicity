import { useMemo, useState } from 'react'
import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/page-header'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { fmt } from '@/lib/format'
import { readPlans, writePlan } from '@/lib/tools/plan-storage'
import {
  addToPlan,
  cleanPlan,
  moraleSurplus,
  nodeState,
  removeFromPlan,
  skillsFor,
  summarizePlan,
  type NodeState,
  type Skill,
} from '@/lib/tools/skill-planner'
import { skillConstants, skillGroups } from '@/lib/tools/skill-tree-data'
import type { DuplicantView } from '@/worker/model'
import { EmptyState } from '@/components/empty-state'
import { Users } from 'lucide-react'

/** Read only: a plan is kept in this browser and never written to the save. */
export function SkillPlannerPage({ duplicants }: { duplicants: DuplicantView[] }) {
  const [dupeId, setDupeId] = useState(duplicants[0]?.id ?? '')
  const dupe = duplicants.find((d) => d.id === dupeId) ?? duplicants[0]
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Skill planner"
        description="Pick a duplicant, click skills to plan a path, and see the morale expectation and experience it takes. Plans stay in this browser; the save is not changed."
        actions={
          <Select value={dupe?.id ?? ''} onValueChange={setDupeId}>
            <SelectTrigger className="w-56" aria-label="Duplicant">
              <SelectValue placeholder="Duplicant" />
            </SelectTrigger>
            <SelectContent>
              {duplicants.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      {dupe ? (
        <Planner key={dupe.id} dupe={dupe} />
      ) : (
        <EmptyState
          icon={Users}
          title="No duplicants"
          description="Nobody to plan for. The colony is empty."
        />
      )}
    </div>
  )
}

const STATE_STYLE: Record<NodeState, string> = {
  mastered: 'bg-[#7c3c5c] text-white',
  planned: 'bg-[#575d6f] text-white outline-2 outline-warn',
  available: 'bg-[#575d6f] text-white hover:bg-[#656c82]',
  locked: 'bg-[#373735] text-muted-foreground hover:bg-[#444441]',
}

function Planner({ dupe }: { dupe: DuplicantView }) {
  const skills = useMemo(
    () => skillsFor({ model: dupe.model, dlcIds: dupe.dlcIds }),
    [dupe.model, dupe.dlcIds],
  )
  const mastered = useMemo(
    () => new Set(dupe.skills.filter((s) => s.mastered).map((s) => s.id)),
    [dupe.skills],
  )
  const interests = useMemo(
    () => new Set(dupe.interests.filter((i) => i.active).map((i) => i.id)),
    [dupe.interests],
  )
  const [plan, setPlan] = useState(() => cleanPlan(readPlans()[dupe.id] ?? [], skills, mastered))
  const [morale, setMorale] = useState('')
  const update = (next: string[]) => {
    setPlan(next)
    writePlan(dupe.id, next)
  }

  const summary = summarizePlan({ skills, mastered, interests, plan, experience: dupe.experience })
  const moraleNow = morale.trim() === '' ? undefined : Number(morale)
  const surplus =
    moraleNow !== undefined && Number.isFinite(moraleNow)
      ? moraleSurplus(summary, moraleNow)
      : undefined
  const groups = skillGroups
    .map((g) => ({ ...g, skills: skills.filter((s) => s.group === g.id) }))
    .filter((g) => g.skills.length > 0)
  const earned = skillConstants.pointsForExperience(dupe.experience)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>
            {plan.length === 0 ? 'No skills planned' : `${plan.length} planned`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stat label="Skill points to spend now" value={String(summary.pointsAvailableNow)} />
            <Stat
              label="Morale expectation"
              value={`${summary.expectationBefore} to ${summary.expectationAfter}`}
              hint="Each skill costs its tier + 1"
            />
            <Stat
              label="Morale from other sources"
              value={String(summary.moraleFromOtherSources)}
              hint="After the base +1 and interests"
            />
            <Stat
              label="Experience still needed"
              value={fmt(summary.experienceMissing, 0)}
              hint={`for ${summary.pointsAfter} skill points in all`}
            />
          </div>
          <Progress
            variant="xp"
            value={Math.min(dupe.experience, summary.experienceNeeded)}
            max={Math.max(1, summary.experienceNeeded)}
            valueLabel={`${fmt(dupe.experience, 0)} / ${fmt(summary.experienceNeeded, 0)}`}
            aria-label="Experience toward the plan"
          />
          <label className="flex flex-wrap items-center gap-2 type-small">
            <span>Current morale, from the duplicant&apos;s Vitals screen</span>
            <Input
              type="number"
              value={morale}
              onChange={(e) => setMorale(e.target.value)}
              aria-label="Current morale"
              className="w-24 text-right tabular-nums"
            />
            {surplus !== undefined && (
              <Badge variant={surplus >= 0 ? 'good' : 'bad'}>
                {surplus >= 0
                  ? `${surplus} to spare after the plan`
                  : `${-surplus} short after the plan`}
              </Badge>
            )}
          </label>
          <p className="type-caption text-muted-foreground">
            The save does not hold morale, so it is entered here. A short morale only raises a
            stress warning; it never stops a skill being learned (MinionResume.cs
            BelowMoraleExpectation, CanMasterSkill). Interests add +1 morale per learned skill of
            that group. {summary.masteredCount} skills mastered; {earned} points earned so far.
            Granted skills (hats) are counted like learned ones because the save list does not
            separate them. Source: {skillConstants.moraleExpectation.cite}.
          </p>
          {summary.steps.length > 0 && (
            <ol className="flex flex-col gap-1">
              {summary.steps.map((step, i) => (
                <li
                  key={step.skill.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 border border-ink bg-well px-3 py-2 type-small"
                >
                  <span className="w-6 text-muted-foreground tabular-nums">{i + 1}</span>
                  <span className="min-w-40 flex-1 font-semibold">{step.skill.name}</span>
                  <span className="tabular-nums">Morale {step.expectationAfter}</span>
                  <span className="tabular-nums">Points {step.pointsAfter}</span>
                  <span className="tabular-nums">XP {fmt(step.experienceNeeded, 0)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => update(removeFromPlan(step.skill.id, skills, plan))}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ol>
          )}
          {plan.length > 0 && (
            <div>
              <Button variant="outline" size="sm" onClick={() => update([])}>
                Clear plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <Card key={g.id} variant="well">
            <CardHeader>
              <CardTitle className="flex flex-1 items-center gap-2">
                {g.name}
                {interests.has(g.id) && <Badge variant="good">Interest</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {[...g.skills]
                .sort((a, b) => a.tier - b.tier)
                .map((skill) => (
                  <SkillNodeButton
                    key={skill.id}
                    skill={skill}
                    state={nodeState(skill, mastered, plan)}
                    skills={skills}
                    onToggle={() =>
                      update(
                        plan.includes(skill.id)
                          ? removeFromPlan(skill.id, skills, plan)
                          : addToPlan(skill.id, skills, mastered, plan),
                      )
                    }
                  />
                ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="type-caption text-muted-foreground">
        Each skill costs 1 skill point and needs all its prerequisites. The experience for N points
        is (N / 15)^1.44 x 250 x 600 (TUNING/SKILLS.cs, MinionResume.cs). Tree and prerequisites:
        Database/Skills.cs.
      </p>
    </>
  )
}

function SkillNodeButton({
  skill,
  state,
  skills,
  onToggle,
}: {
  skill: Skill
  state: NodeState
  skills: Skill[]
  onToggle: () => void
}) {
  const names = skill.requires.map((r) => skills.find((s) => s.id === r)?.name ?? r)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={state === 'mastered'}
          onClick={onToggle}
          aria-pressed={state === 'planned'}
          className={cn(
            'flex items-center justify-between gap-2 border border-ink px-3 py-2 text-left type-small',
            STATE_STYLE[state],
          )}
        >
          <span className="font-semibold">{skill.name}</span>
          <span className="shrink-0 tabular-nums opacity-80">
            {state === 'mastered' ? 'Learned' : `Morale ${skill.tier + 1}`}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        <div className="flex flex-col gap-1">
          {skill.perks.map((p) => (
            <span key={p.id}>
              {p.text ?? `${p.attribute} +${p.amount}`}
              {p.text && p.attribute ? ` (${p.attribute} +${p.amount})` : ''}
            </span>
          ))}
          <span className="text-muted-foreground">
            {names.length > 0 ? `Needs ${names.join(', ')}` : 'No prerequisite'}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-ink bg-inset px-3 py-2">
      <div className="type-caption text-muted-foreground">{label}</div>
      <div className="type-h3 tabular-nums">{value}</div>
      {hint && <div className="type-caption text-muted-foreground">{hint}</div>}
    </div>
  )
}
