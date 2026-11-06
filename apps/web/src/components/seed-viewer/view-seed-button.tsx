import { Telescope } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { openSeed } from './seed-viewer-store'

/** The primary seed action everywhere: open the seed in the in-app viewer. */
export function ViewSeedButton({
  coordinate,
  ...props
}: { coordinate: string } & Omit<ComponentProps<typeof Button>, 'onClick' | 'children'>) {
  return (
    <Button type="button" onClick={() => openSeed(coordinate)} {...props}>
      <Telescope />
      View seed
    </Button>
  )
}
