import type { CSSProperties, ReactNode } from 'react'
import { ChevronDown, FolderOpen, Orbit, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface OpenFile {
  name: string
  colony: string
  cycle: number
  version: string
}

/** The top bar: brand, the open save with its colony and cycle, then the edit actions. */
export function SiteHeader({
  file,
  actions,
  onOpen,
  onClose,
}: {
  file: OpenFile | null
  actions?: ReactNode
  onOpen: () => void
  onClose: () => void
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ink bg-ground px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center border border-ink bg-title text-fg">
          <Orbit className="size-5" />
        </span>
        <div className="leading-none">
          <p className="text-h2 font-heading uppercase">Duplicity</p>
          <p className="hidden text-caption text-fg-3 sm:block">ONI save editor</p>
        </div>
      </div>

      {file ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-auto max-w-full min-w-0 justify-start gap-3 py-1 text-left font-sans font-normal tracking-normal normal-case"
            >
              <span className="min-w-0 leading-tight">
                <span className="text-h3 block truncate font-heading">{file.colony}</span>
                <span className="text-caption block truncate text-fg-3">{file.name}</span>
              </span>
              <span className="chip shrink-0" style={{ '--c': 'var(--gold)' } as CSSProperties}>
                Cycle {file.cycle}
              </span>
              <ChevronDown className="size-4 shrink-0 text-fg-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56">
            <DropdownMenuLabel className="truncate">{file.name}</DropdownMenuLabel>
            <p className="px-2 pb-1 text-caption text-fg-3">Save version {file.version}</p>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onOpen}>
              <FolderOpen /> Open another save
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onClose}>
              <X /> Close save
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
    </header>
  )
}
