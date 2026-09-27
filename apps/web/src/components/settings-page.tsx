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
import { humanize } from '@/lib/format'
import type { Edit, GameSettingView } from '@/worker/model'

export function SettingsPage({
  settings,
  onEdit,
}: {
  settings: GameSettingView[]
  onEdit: (edit: Edit) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Game settings</CardTitle>
        <CardDescription>
          The difficulty options from the new-game screen. Some only affect things that happen after
          the game loads.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid gap-x-8 gap-y-6 @3xl/main:grid-cols-2">
          {settings.map((setting) => {
            const current = setting.levels.find((l) => l.id === setting.current)
            return (
              <Field key={setting.id} orientation="responsive">
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
                  <Badge variant="outline" className="h-8 gap-1.5 px-3">
                    <Lock /> {humanize(setting.current)}
                  </Badge>
                )}
              </Field>
            )
          })}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
