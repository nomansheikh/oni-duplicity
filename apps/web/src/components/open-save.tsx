import { useState } from 'react'
import { FileUp, LoaderCircle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty'
import { LoadPanel } from '@/components/load-states'
import { fetchExampleSave } from '@/app/example-save'
import { cn } from '@/lib/utils'

const code = 'bg-inset px-1.5 py-0.5 font-mono type-caption text-foreground border border-ink'

const SAVE_FOLDERS = [
  { os: 'Windows', path: 'Documents/Klei/OxygenNotIncluded' },
  { os: 'macOS', path: '~/Library/Application Support/unity.Klei.Oxygen Not Included' },
]

/** Where saves live, one whole path per line; a path too long for the screen scrolls sideways. */
function SaveFolders() {
  return (
    <dl className="mx-auto grid w-fit max-w-full grid-cols-[minmax(0,1fr)] gap-x-3 gap-y-1 text-left sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-y-1.5">
      {SAVE_FOLDERS.map(({ os, path }) => (
        <div key={os} className="contents">
          <dt className="type-label text-fg-2 uppercase">{os}</dt>
          <dd className="min-w-0">
            <code
              className={cn(
                code,
                'block overflow-x-auto whitespace-nowrap select-all [scrollbar-width:thin]',
              )}
              title={path}
            >
              {path}
            </code>
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Opens the bundled example colony through the same `onFile` as a picked save. */
function ExampleButton({ onFile }: { onFile: (file: File) => void }) {
  const [progress, setProgress] = useState<number | null>(null)
  const tryExample = async () => {
    setProgress(0)
    try {
      const file = await fetchExampleSave(setProgress)
      toast.info('Opening the example save', {
        description: 'A shared 89-cycle colony with every DLC. Your own saves are not touched.',
      })
      onFile(file)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setProgress(null)
    }
  }
  const busy = progress !== null
  return (
    <Button size="lg" variant="outline" onClick={tryExample} disabled={busy} aria-busy={busy}>
      {busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
      {busy ? `Downloading example ${Math.round(progress * 100)}%` : 'Try an example save'}
    </Button>
  )
}

export function OpenSave({ onFile, onPick }: { onFile: (file: File) => void; onPick: () => void }) {
  const [over, setOver] = useState(false)
  return (
    <LoadPanel title="Load game">
      <Empty
        className={cn(
          'min-h-[45vh] gap-5 border-2 border-dashed border-edge bg-inset p-4 transition-colors sm:p-8',
          over && 'border-warn bg-well',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          const file = e.dataTransfer.files[0]
          if (file) onFile(file)
        }}
      >
        <EmptyHeader className="w-full max-w-2xl">
          <EmptyMedia
            variant="icon"
            className="size-16 bg-well [&_svg:not([class*='size-'])]:size-8"
          >
            <FileUp />
          </EmptyMedia>
          <div data-slot="empty-title" className="type-h2 uppercase">
            Open an Oxygen Not Included save
          </div>
          <EmptyDescription>
            Drop a <code className={code}>.sav</code> file here. Saves live in:
          </EmptyDescription>
          <SaveFolders />
        </EmptyHeader>
        <EmptyContent className="max-w-xl">
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="lg" onClick={onPick}>
              Choose a save
            </Button>
            <ExampleButton onFile={onFile} />
          </div>
          <EmptyDescription className="type-caption">
            Everything runs in your browser. Your save is never uploaded.
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    </LoadPanel>
  )
}
