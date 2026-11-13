import { useState } from 'react'
import { Check, ChevronRight, Copy, LoaderCircle, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import { loadErrorReport, type LoadErrorInfo } from '@/lib/load-error'
import { cn } from '@/lib/utils'

/** The game's panel: mauve title bar over a slate body that holds the load screen states. */
export function LoadPanel({
  title,
  tone = 'default',
  children,
}: {
  title: string
  tone?: 'default' | 'error'
  children: React.ReactNode
}) {
  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader
        className={cn(tone === 'error' && 'bg-[color-mix(in_oklab,var(--bad)_65%,#000)]')}
      >
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
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
          <div data-slot="empty-title" className="type-h2 uppercase break-all">
            Reading {fileName}
          </div>
          <EmptyDescription>Large late-game saves take a few seconds.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="max-w-md">
          <Progress variant="task" value={Math.round(progress * 100)} />
        </EmptyContent>
      </Empty>
    </LoadPanel>
  )
}

/**
 * A spinner over a pane whose content is still being worked out. It sits on top of what the
 * pane already shows (positioned against the nearest relative parent), so nothing moves when
 * it appears or goes away.
 */
export function LoadingOverlay({ label, className }: { label: string; className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        'absolute inset-0 z-10 flex items-center justify-center bg-legend/75 animate-in duration-150 fade-in',
        className,
      )}
    >
      <div className="well flex items-center gap-3">
        <LoaderCircle className="size-5 shrink-0 animate-spin" aria-hidden />
        <span className="type-small">{label}</span>
      </div>
    </div>
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
          <div data-slot="empty-title" className="type-h2 uppercase">
            {info.title}
          </div>
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
