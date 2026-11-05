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

export function OpenSave({ onFile, onPick }: { onFile: (file: File) => void; onPick: () => void }) {
  const [over, setOver] = useState(false)
  return (
    <Empty
      className={cn(
        'min-h-[60vh] border border-dashed transition-colors',
        over && 'border-primary bg-primary/5',
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
        <EmptyMedia variant="icon">
          <FileUp />
        </EmptyMedia>
        <EmptyTitle>Open an Oxygen Not Included save</EmptyTitle>
        <EmptyDescription>
          Drop a <code>.sav</code> file here. Saves live in{' '}
          <code>Documents/Klei/OxygenNotIncluded</code> on Windows and{' '}
          <code>~/Library/Application Support/unity.Klei.Oxygen Not Included</code> on macOS.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onPick}>Choose a save</Button>
        <EmptyDescription>
          Everything runs in your browser. Your save is never uploaded.
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  )
}

export function LoadingSave({ fileName, progress }: { fileName: string; progress: number }) {
  return (
    <Empty className="min-h-[60vh]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LoaderCircle className="animate-spin" />
        </EmptyMedia>
        <EmptyTitle>Reading {fileName}</EmptyTitle>
        <EmptyDescription>Large late-game saves take a few seconds.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Progress value={Math.round(progress * 100)} className="w-64" />
      </EmptyContent>
    </Empty>
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
    <Empty className="min-h-[60vh] border border-dashed border-destructive/50">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="text-destructive">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>{info.title}</EmptyTitle>
        <EmptyDescription>{info.hint}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onPick}>Try another save</Button>
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
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
              <pre
                aria-label="Error details"
                className="max-h-64 overflow-auto font-mono text-xs break-all whitespace-pre-wrap"
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
  )
}
