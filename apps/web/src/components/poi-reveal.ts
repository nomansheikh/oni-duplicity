import type { RevealLevel } from '@/worker/pois'

export const REVEAL: Record<
  RevealLevel,
  { label: string; variant: 'good' | 'info' | 'secondary' }
> = {
  revealed: { label: 'Revealed', variant: 'good' },
  peeked: { label: 'Peeked', variant: 'info' },
  hidden: { label: 'Hidden', variant: 'secondary' },
}
