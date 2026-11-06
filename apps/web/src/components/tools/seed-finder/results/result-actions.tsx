import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { ViewSeedButton } from '@/components/seed-viewer/view-seed-button'
import { Button } from '@/components/ui/button'
import { CompareLink } from '@/components/seed-viewer/compare-link'

/** "View seed" in the app, "Copy code", and a quiet link to compare on Mapsnotincluded. */
export function ResultActions({
  coordinate,
  size = 'sm',
}: {
  coordinate: string
  size?: 'sm' | 'default'
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(coordinate)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked: leave the button as it was.
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ViewSeedButton coordinate={coordinate} variant="secondary" size={size} />
      <Button variant="outline" size={size} onClick={copy}>
        {copied ? <Check /> : <Copy />}
        {copied ? 'Copied' : 'Copy code'}
      </Button>
      <CompareLink coordinate={coordinate} />
    </div>
  )
}
