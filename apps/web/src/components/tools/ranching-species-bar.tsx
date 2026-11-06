import { ranching } from '@oni-duplicity/game-data'
import { DlcBadge } from '@/components/dlc-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RanchControls } from './ranching-controls'

const FAMILIES = [...new Set(ranching.species.map((s) => s.family))]

/** Species and morph picker, with a shortcut per herd found in the save. */
export function SpeciesBar({ species, herds, pickSpecies }: RanchControls) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-wrap items-center gap-3 py-3">
        <span className="type-label text-muted-foreground">Species and morph</span>
        <Select value={species.id} onValueChange={(id) => pickSpecies(id)}>
          <SelectTrigger className="w-64" aria-label="Species and morph">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FAMILIES.map((family) => {
              const members = ranching.species.filter((s) => s.family === family)
              return (
                <SelectGroup key={family}>
                  <SelectLabel>{members[0]!.familyName}</SelectLabel>
                  {members.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            })}
          </SelectContent>
        </Select>
        {species.dlcIds.map((id) => (
          <DlcBadge key={id} id={id} />
        ))}
        {herds.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="type-label text-muted-foreground">From your save</span>
            {herds.map((h) => (
              <Button
                key={h.species.id}
                variant={h.species.id === species.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => pickSpecies(h.species.id, h.count)}
              >
                {h.species.name} x{h.count}
                {h.babies > 0 && ` (${h.babies} baby)`}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
