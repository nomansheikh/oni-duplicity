import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ViewSeedButton } from '@/components/seed-viewer/view-seed-button'
import { CompareLink } from '@/components/seed-viewer/compare-link'
import { Button } from '@/components/ui/button'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item'
import type { Summary } from '@/worker/model'

/** The world's settings coordinate, as the game's pause screen shows it, with a way to view its map. */
export function SeedCoordinate({ summary }: { summary: Summary }) {
  const [copied, setCopied] = useState(false)
  const seed = summary.seedCoordinate
  const copy = async () => {
    if (!seed) return
    try {
      await navigator.clipboard.writeText(seed.coordinate)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy to the clipboard')
    }
  }
  return (
    <Item variant="outline" size="sm" className="flex-wrap" data-testid="seed-coordinate">
      <ItemContent className="min-w-full">
        <ItemTitle>World seed</ItemTitle>
        {seed ? (
          <>
            <ItemDescription className="type-caption font-mono break-all select-all">
              {seed.coordinate}
            </ItemDescription>
            <ItemDescription className="type-caption line-clamp-none">
              Story traits are not stored in a save, so the map assumes none were guaranteed when
              the world was made.
            </ItemDescription>
          </>
        ) : (
          <ItemDescription>
            This save does not say which seed it was made from, so there is no coordinate to show.
          </ItemDescription>
        )}
      </ItemContent>
      {seed && (
        <ItemActions>
          <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
            {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
          </Button>
          <ViewSeedButton coordinate={seed.coordinate} variant="secondary" size="sm" />
          <CompareLink coordinate={seed.coordinate} />
        </ItemActions>
      )}
    </Item>
  )
}
