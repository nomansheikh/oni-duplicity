import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { mapsNotIncludedLink } from '@/lib/mapsnotincluded'

/** The quiet secondary link to the same seed on Mapsnotincluded. */
export function CompareLink({ coordinate }: { coordinate: string }) {
  return (
    <Button variant="link" size="xs" asChild>
      <a href={mapsNotIncludedLink(coordinate)} target="_blank" rel="noreferrer">
        <ExternalLink />
        Compare on Mapsnotincluded
      </a>
    </Button>
  )
}
