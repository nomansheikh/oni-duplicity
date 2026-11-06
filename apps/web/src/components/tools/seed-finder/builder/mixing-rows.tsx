import type { MixingSetting } from '@oni-duplicity/game-data'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { dlcName } from '@/seed/clusters'
import { topLevel } from '@/seed/mixing'

/** A DLC content toggle. */
export function DlcRow({
  setting,
  level,
  onChange,
}: {
  setting: MixingSetting
  level: number
  onChange: (level: number) => void
}) {
  const id = `mixing-${setting.id}`
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="type-small" title={setting.desc}>
        {setting.name}
      </label>
      <Switch
        id={id}
        size="sm"
        checked={level > 0}
        onCheckedChange={(on) => onChange(on ? topLevel(setting) : 0)}
      />
    </div>
  )
}

/**
 * An asteroid or biome remix: Disabled, Likely or Guaranteed, with the game's level names. It is
 * greyed out while its DLC is not in play, and Guaranteed is while the cluster has no room left.
 */
export function RemixRow({
  setting,
  level,
  available,
  roomLeft,
  onChange,
}: {
  setting: MixingSetting
  level: number
  available: boolean
  roomLeft: boolean
  onChange: (level: number) => void
}) {
  const guaranteed = topLevel(setting)
  const missing = setting.requiredDlcIds.map(dlcName).join(', ')
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span
          className={available ? 'type-small' : 'type-small text-muted-foreground'}
          title={setting.desc}
        >
          {setting.name}
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-label={setting.name}
          disabled={!available}
          value={String(available ? level : 0)}
          onValueChange={(value) => value && onChange(Number(value))}
        >
          {setting.levels.map((option) => (
            <ToggleGroupItem
              key={option.id}
              value={String(option.value)}
              title={option.desc}
              disabled={option.value === guaranteed && !roomLeft && level !== guaranteed}
            >
              {option.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {!available && (
        <p className="type-caption text-muted-foreground">Turn on {missing} above to use it.</p>
      )}
    </div>
  )
}
