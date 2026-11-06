import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { humanize } from '@/lib/format'
import { saveClient } from '@/lib/save-client'
import type { Edit, GameSettingView, Summary } from '@/worker/model'
import { PageHeader } from './page-header'
import { SeedCoordinate } from './seed-coordinate'

// The sandbox switch below edits this setting too, so it is not listed twice.
const SANDBOX_SETTING = 'SandboxMode'

export function SettingsPage({
  settings,
  onEdit,
}: {
  settings: GameSettingView[]
  onEdit: (edit: Edit) => void
}) {
  const [summary, setSummary] = useState<Summary | null>(null)
  useEffect(() => {
    let cancelled = false
    void saveClient.summary().then((next) => !cancelled && setSummary(next))
    return () => {
      cancelled = true
    }
  }, [settings]) // the views are rebuilt after every edit

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="Difficulty"
        description="The difficulty options from the new-game screen, and the sandbox and debug flags. Some only affect things that happen after the game loads."
      />
      {summary && (
        <Card variant="well">
          <CardHeader>
            <CardTitle>Game modes</CardTitle>
            <CardDescription>Flags that decide whether achievements can be earned.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field orientation="horizontal" className="well">
                <FieldContent>
                  <FieldLabel htmlFor="sandbox">Sandbox mode</FieldLabel>
                  <FieldDescription>Unlocks the sandbox tools in game.</FieldDescription>
                </FieldContent>
                <Switch
                  id="sandbox"
                  checked={summary.sandbox}
                  onCheckedChange={(enabled) => onEdit({ type: 'setSandbox', enabled })}
                />
              </Field>
              <Field orientation="horizontal" className="well">
                <FieldContent>
                  <FieldLabel htmlFor="debug-used">Debug mode was used</FieldLabel>
                  <FieldDescription>
                    The game sets this for good once debug tools are used. Achievements need it off,
                    and sandbox mode off too.{' '}
                    {summary.debugWasUsed || summary.sandbox ? (
                      <Badge variant="warn">Achievements blocked</Badge>
                    ) : (
                      <Badge variant="good">Achievements on</Badge>
                    )}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id="debug-used"
                  checked={summary.debugWasUsed}
                  onCheckedChange={(used) => onEdit({ type: 'setDebugWasUsed', used })}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      )}
      {summary && <SeedCoordinate summary={summary} />}
      <Card variant="well">
        <CardHeader>
          <CardTitle>Difficulty options</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-3 @3xl/main:grid-cols-2">
            {settings
              .filter((setting) => setting.id !== SANDBOX_SETTING)
              .map((setting) => {
                const current = setting.levels.find((l) => l.id === setting.current)
                return (
                  <Field key={setting.id} orientation="responsive" className="well">
                    <FieldContent>
                      <FieldLabel htmlFor={`setting-${setting.id}`}>{setting.name}</FieldLabel>
                      <FieldDescription className="line-clamp-2">
                        {current?.desc ?? setting.desc}
                      </FieldDescription>
                    </FieldContent>
                    {setting.editable ? (
                      <Select
                        value={setting.current}
                        onValueChange={(level) =>
                          onEdit({ type: 'setGameSetting', settingId: setting.id, level })
                        }
                      >
                        <SelectTrigger id={`setting-${setting.id}`} className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {setting.levels.map((level) => (
                            <SelectItem key={level.id} value={level.id}>
                              {level.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="stat">
                        <Lock /> {humanize(setting.current)}
                      </Badge>
                    )}
                  </Field>
                )
              })}
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  )
}
