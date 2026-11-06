import { Check, Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { mapsLink } from './labels'

/** "Copy code" and "Open on Mapsnotincluded". */
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
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size={size} onClick={copy}>
        {copied ? <Check /> : <Copy />}
        {copied ? 'Copied' : 'Copy code'}
      </Button>
      <Button variant="outline" size={size} asChild>
        <a href={mapsLink(coordinate)} target="_blank" rel="noreferrer">
          <ExternalLink />
          Open on Mapsnotincluded
        </a>
      </Button>
    </div>
  )
}
