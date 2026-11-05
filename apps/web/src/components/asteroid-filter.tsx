import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WorldView } from '@/worker/model'

/** The asteroid filter of the critters and geysers pages; hidden when the save has one asteroid. */
export function AsteroidFilter({
  worlds,
  value,
  onChange,
}: {
  worlds: WorldView[]
  value: string
  onChange: (value: string) => void
}) {
  if (worlds.length < 2) return null
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48" aria-label="Asteroid">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All asteroids</SelectItem>
        {worlds.map((w) => (
          <SelectItem key={w.id} value={w.id}>
            {w.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
