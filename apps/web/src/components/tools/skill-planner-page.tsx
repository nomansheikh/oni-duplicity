import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { readPlans, writePlan } from '@/lib/tools/plan-storage'
import { skillsFor } from '@/lib/tools/skill-data'
import { skillTree } from '@oni-duplicity/game-data'
import { cleanPlan, summarizePlan } from '@/lib/tools/skill-planner'
import { SkillGroupGrid } from './skill-group-grid'
import { SkillPlanCard } from './skill-plan-card'
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
  const update = (next: string[]) => {
    setPlan(next)
    writePlan(dupe.id, next)
  }
  const summary = summarizePlan({ skills, mastered, interests, plan, experience: dupe.experience })
  const T = skillTree.tuning

  return (
    <>
      <SkillPlanCard
        summary={summary}
        skills={skills}
        plan={plan}
        experience={dupe.experience}
        onChange={update}
      />
      <SkillGroupGrid
        skills={skills}
        mastered={mastered}
        interests={interests}
        plan={plan}
        onChange={update}
      />
      <p className="type-caption text-muted-foreground">
        Each skill costs 1 skill point and needs all its prerequisites. The experience for N points
        is (N / {T.targetSkillsEarned})^{T.experienceLevelPower} x {T.targetSkillsCycle} x{' '}
        {T.secondsPerCycle} (TUNING/SKILLS.cs, MinionResume.cs). Tree and prerequisites:
        Database/Skills.cs.
      </p>
    </>
  )
}
