import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { fmt } from '@/lib/format'
import type { Skill } from '@/lib/tools/skill-data'
import { pointsForExperience } from '@/lib/tools/skill-math'
import { moraleSurplus, removeFromPlan, type PlanSummary } from '@/lib/tools/skill-planner'

/** The plan: totals, the experience bar, the morale check and the planned skills in order. */
export function SkillPlanCard({
  summary,
  skills,
  plan,
  experience,
  onChange,
}: {
  summary: PlanSummary
  skills: Skill[]
  plan: string[]
  experience: number
  onChange: (plan: string[]) => void
}) {
  const [morale, setMorale] = useState('')
  const moraleNow = morale.trim() === '' ? undefined : Number(morale)
  const surplus =
    moraleNow !== undefined && Number.isFinite(moraleNow)
      ? moraleSurplus(summary, moraleNow)
      : undefined
  return (
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
            hint="Each skill adds its morale cost"
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
          value={Math.min(experience, summary.experienceNeeded)}
          max={Math.max(1, summary.experienceNeeded)}
          valueLabel={`${fmt(experience, 0)} / ${fmt(summary.experienceNeeded, 0)}`}
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
          The save does not hold morale, so it is entered here. A short morale only raises a stress
          warning; it never stops a skill being learned (MinionResume.cs BelowMoraleExpectation,
          CanMasterSkill). Interests add +1 morale per learned skill of that group.{' '}
          {summary.masteredCount} skills mastered; {pointsForExperience(experience)} points earned
          so far. Granted skills (hats) are counted like learned ones because the save list does not
          separate them. Source: MinionResume.cs UpdateExpectations, TUNING/SKILLS.cs.
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
                  onClick={() => onChange(removeFromPlan(step.skill.id, skills, plan))}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ol>
        )}
        {plan.length > 0 && (
          <div>
            <Button variant="outline" size="sm" onClick={() => onChange([])}>
              Clear plan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
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
