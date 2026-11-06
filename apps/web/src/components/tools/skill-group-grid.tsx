import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { skillGroups, type Skill } from '@/lib/tools/skill-data'
import { addToPlan, nodeState, removeFromPlan, type NodeState } from '@/lib/tools/skill-planner'

const STATE_STYLE: Record<NodeState, string> = {
  mastered: 'bg-[#7c3c5c] text-white',
  planned: 'bg-[#575d6f] text-white outline-2 outline-warn',
  available: 'bg-[#575d6f] text-white hover:bg-[#656c82]',
  locked: 'bg-[#373735] text-muted-foreground hover:bg-[#444441]',
}

/** One card per skill group with its skills in tier order; click a skill to plan or unplan it. */
export function SkillGroupGrid({
  skills,
  mastered,
  interests,
  plan,
  onChange,
}: {
  skills: Skill[]
  mastered: ReadonlySet<string>
  interests: ReadonlySet<string>
  plan: string[]
  onChange: (plan: string[]) => void
}) {
  const groups = skillGroups
    .map((g) => ({ ...g, skills: skills.filter((s) => s.group === g.id) }))
    .filter((g) => g.skills.length > 0)
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((g) => (
        <Card key={g.id} variant="well">
          <CardHeader>
            <CardTitle className="flex flex-1 items-center gap-2">
              {g.name || g.id}
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
                    onChange(
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
            {state === 'mastered' ? 'Learned' : `Morale ${skill.moraleCost}`}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        <div className="flex flex-col gap-1">
          {skill.givenPerks.map((p) => (
            <span key={p.id}>{p.text}</span>
          ))}
          <span className="text-muted-foreground">
            {names.length > 0 ? `Needs ${names.join(', ')}` : 'No prerequisite'}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
