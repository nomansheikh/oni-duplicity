import { useState } from 'react'
import { Check, ChevronRight, Copy, FileUp, LoaderCircle, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import { loadErrorReport, type LoadErrorInfo } from '@/lib/load-error'
import { cn } from '@/lib/utils'

const code = 'bg-inset px-1.5 py-0.5 font-mono type-caption text-foreground border border-ink'

/** The game's panel: mauve title bar over a slate body that holds the load screen states. */
function LoadPanel({
  title,
  tone = 'default',
  children,
}: {
  title: string
  tone?: 'default' | 'error'
  children: React.ReactNode
}) {
  return (
    <section className="panel mx-auto w-full max-w-3xl">
      <div className={cn('title-bar', tone === 'error' && 'bg-[#962a28]')}>{title}</div>
      <div className="p-3">{children}</div>
    </section>
  )
}

export function OpenSave({ onFile, onPick }: { onFile: (file: File) => void; onPick: () => void }) {
  const [over, setOver] = useState(false)
  return (
    <LoadPanel title="Load game">
      <Empty
        className={cn(
          'min-h-[45vh] gap-5 border-2 border-dashed border-edge bg-inset p-8 transition-colors',
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
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="size-16 bg-well [&_svg:not([class*='size-'])]:size-8"
          >
            <FileUp />
          </EmptyMedia>
          <EmptyTitle className="text-h2!">Open an Oxygen Not Included save</EmptyTitle>
          <EmptyDescription>
            Drop a <code className={code}>.sav</code> file here. Saves live in{' '}
            <code className={code}>Documents/Klei/OxygenNotIncluded</code> on Windows and{' '}
            <code className={code}>
              ~/Library/Application Support/unity.Klei.Oxygen Not Included
            </code>{' '}
            on macOS.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="lg" onClick={onPick}>
            Choose a save
          </Button>
          <EmptyDescription className="type-caption">
            Everything runs in your browser. Your save is never uploaded.
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    </LoadPanel>
  )
}

export function LoadingSave({ fileName, progress }: { fileName: string; progress: number }) {
  return (
    <LoadPanel title="Loading">
      <Empty className="min-h-[45vh] gap-5 border-edge bg-inset p-8">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="size-16 bg-well [&_svg:not([class*='size-'])]:size-8"
          >
            <LoaderCircle className="animate-spin" />
          </EmptyMedia>
          <EmptyTitle className="text-h2! break-all">Reading {fileName}</EmptyTitle>
          <EmptyDescription>Large late-game saves take a few seconds.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="max-w-md">
          <Progress variant="task" value={Math.round(progress * 100)} />
        </EmptyContent>
      </Empty>
    </LoadPanel>
  )
}

export function LoadError({ info, onPick }: { info: LoadErrorInfo; onPick: () => void }) {
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(loadErrorReport(info))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy to the clipboard')
    }
  }
  return (
    <LoadPanel title="Load failed" tone="error">
      <Empty className="min-h-[45vh] gap-5 border-2 border-dashed border-destructive/60 bg-inset p-8">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="size-16 border-destructive bg-well text-destructive [&_svg:not([class*='size-'])]:size-8"
          >
            <TriangleAlert />
          </EmptyMedia>
          <EmptyTitle className="text-h2!">{info.title}</EmptyTitle>
          <EmptyDescription>{info.hint}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="lg" onClick={onPick}>
            Try another save
          </Button>
          <div className="flex w-full max-w-xl flex-col gap-2 text-left">
            <Button
              variant="ghost"
              size="sm"
              className="self-center"
              aria-expanded={showDetails}
              onClick={() => setShowDetails((v) => !v)}
            >
              <ChevronRight className={cn('transition-transform', showDetails && 'rotate-90')} />
              Details
            </Button>
            {showDetails && (
              <div className="well flex flex-col gap-2">
                <pre
                  aria-label="Error details"
                  className="field-game max-h-64 overflow-auto p-2 font-mono type-caption break-all whitespace-pre-wrap"
                >
                  {loadErrorReport(info).split('\n').slice(1).join('\n')}
                </pre>
                <Button variant="outline" size="sm" className="self-end" onClick={copy}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? 'Copied' : 'Copy details'}
                </Button>
              </div>
            )}
          </div>
        </EmptyContent>
      </Empty>
    </LoadPanel>
  )
}
