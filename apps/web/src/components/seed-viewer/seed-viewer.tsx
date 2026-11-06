import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DetailsActions } from '@/components/tools/seed-finder/details/details-actions'
import { SeedDetails } from '@/components/tools/seed-finder/details/seed-details'
import { closeSeed, useViewedSeed } from './seed-viewer-store'

/** The seed viewer: any coordinate, regenerated in full. Mounted once, opened from anywhere. */
export function SeedViewer() {
  const coordinate = useViewedSeed()
  return (
    <Dialog open={coordinate !== undefined} onOpenChange={(open) => !open && closeSeed()}>
      <DialogContent className="h-[min(56rem,calc(100vh-2rem))] grid-rows-[auto_minmax(0,1fr)] sm:max-w-[min(1280px,calc(100vw-2rem))]">
        {coordinate && (
          <>
            <DialogHeader>
              <DialogTitle>Seed viewer</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-3 font-mono">
                {coordinate}
                <DetailsActions coordinate={coordinate} />
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto bg-panel p-4">
              <SeedDetails key={coordinate} coordinate={coordinate} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
