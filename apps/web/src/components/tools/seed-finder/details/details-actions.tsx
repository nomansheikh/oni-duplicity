import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CompareLink } from '@/components/seed-viewer/compare-link'

/** "Copy code" and a quieter link to compare the seed on Mapsnotincluded. */
export function DetailsActions({ coordinate }: { coordinate: string }) {
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
      <Button variant="secondary" size="sm" onClick={copy}>
        {copied ? <Check /> : <Copy />}
        {copied ? 'Copied' : 'Copy code'}
      </Button>
      <CompareLink coordinate={coordinate} />
    </div>
  )
}
