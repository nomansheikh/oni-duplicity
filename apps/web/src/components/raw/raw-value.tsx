import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { Edit, RawEntry } from '@/worker/model'
import { CommitInput } from '../common'
import { KIND_STYLES } from './types'

export function RawValue({ entry, onEdit }: { entry: RawEntry; onEdit: (edit: Edit) => void }) {
  const set = (value: string | number | boolean | null) =>
    onEdit({ type: 'rawSet', path: entry.path, value })
  switch (entry.kind) {
    case 'object':
      return <span>{`{ ${entry.size} }`}</span>
    case 'array':
      return <span>{`[ ${entry.size} ]`}</span>
    case 'bytes':
      return (
        <span className="truncate">
          {entry.size} bytes <span className="text-fg-2">{entry.value}</span>{' '}
          <Badge variant="outline" title="Byte arrays cannot be edited here">
            read-only
          </Badge>
        </span>
      )
    case 'boolean':
      return (
        <Switch
          size="sm"
          checked={entry.value === true}
          aria-label={String(entry.key)}
          onCheckedChange={(checked) => set(checked)}
        />
      )
    case 'null':
      return <span>null</span>
    default:
      return (
        <CommitInput
          value={String(entry.value)}
          aria-label={String(entry.key)}
          className={cn('h-8 max-w-md font-mono', KIND_STYLES[entry.kind])}
          onCommit={(text) => set(entry.kind === 'string' ? text : text.trim())}
        />
      )
  }
}
