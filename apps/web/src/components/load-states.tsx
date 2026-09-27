import { useState } from 'react'
import { FileUp, LoaderCircle, TriangleAlert } from 'lucide-react'
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

export function LoadError({ message, onPick }: { message: string; onPick: () => void }) {
  return (
    <Empty className="min-h-[60vh] border border-dashed border-destructive/50">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="text-destructive">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>This save could not be loaded</EmptyTitle>
        <EmptyDescription className="font-mono text-xs break-all">{message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onPick}>Try another save</Button>
      </EmptyContent>
    </Empty>
  )
}
