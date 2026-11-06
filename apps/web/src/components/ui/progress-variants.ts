import { cva } from 'class-variance-authority'

import type { ProgressTone } from '@/lib/meter'

export const bevel = (c: string) =>
  `inset 0 1px 0 color-mix(in srgb,${c} 38%,#000),inset 0 -1px 0 color-mix(in srgb,${c} 43%,#000),inset -2px 0 0 color-mix(in srgb,${c} 66%,#000),inset 0 -2px 0 color-mix(in srgb,${c} 66%,#000),inset 0 -3px 0 color-mix(in srgb,${c} 90%,#000)`

// bar: the plain thin bar (default). blocks: the morale meter. gauge: the in-world storage gauge. xp: the skill XP bar.
// task: the in-world task bar (research, geyser). Tone sets --c (blocks) and --gf1/--gf2 (gauge).
export const progressVariants = cva('relative w-full', {
  variants: {
    variant: {
      bar: 'h-1.5 overflow-hidden rounded-none bg-[#090304] shadow-[inset_0_0_0_1px_rgb(0_0_0/.6)]',
      blocks: 'grid gap-[3px]',
      xp: 'h-[2.2rem] overflow-hidden rounded-none border border-b-2 border-ink bg-[#454545]',
      task: 'h-[0.95rem] overflow-hidden rounded-none border-2 border-[#fffef7] bg-[#090304]',
      gauge:
        'h-[1.55rem] overflow-hidden rounded-none border-[3px] border-[#607470] bg-[#302820] outline-1 outline-ink',
    },
    tone: {
      good: '[--c:#51ad52] [--gf1:#5cd418] [--gf2:#50c800]',
      warn: '[--c:#d9a63a] [--gf1:#e8b44a] [--gf2:#d9a63a]',
      bad: '[--c:#c56660] [--gf1:#d47873] [--gf2:#c56660]',
    },
  },
  defaultVariants: { variant: 'bar', tone: 'good' },
})

export const stateColor: Record<ProgressTone, string> = {
  good: 'text-m-good-text',
  warn: 'text-m-warn-text',
  bad: 'text-m-bad-text',
}
