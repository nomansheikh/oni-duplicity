import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Progress as ProgressPrimitive } from 'radix-ui'

// Meter tones use the category and meter colours. The final in-game look of the bar itself
// (block pitch, bevel, over-max tail) is pending the meter spec; the API below is stable.
const progressTones = {
  good: 'var(--m-good)',
  warn: 'var(--m-warn)',
  bad: 'var(--m-bad)',
  xp: 'var(--m-xp)',
  geyser: 'var(--m-geyser)',
  dormant: 'var(--m-dormant)',
  oxygen: 'var(--cat-oxygen)',
  water: 'var(--cat-water)',
  food: 'var(--cat-food)',
  power: 'var(--cat-power)',
  metal: 'var(--cat-metal)',
  plant: 'var(--cat-plant)',
  critter: 'var(--cat-critter)',
  gas: 'var(--cat-gas)',
  liquid: 'var(--cat-liquid)',
  solid: 'var(--cat-solid)',
} as const

type ProgressTone = keyof typeof progressTones

const progressVariants = cva(
  'relative flex w-full items-center overflow-hidden rounded-none border border-ink bg-inset p-px',
  {
    variants: {
      size: {
        sm: 'h-2.5',
        default: 'h-3.5',
        lg: 'h-5',
      },
    },
    defaultVariants: { size: 'default' },
  },
)

function Progress({
  className,
  value,
  tone = 'good',
  segmented = false,
  size,
  label,
  valueLabel,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> &
  VariantProps<typeof progressVariants> & {
    /** Colour of the fill, taken from the category and meter colours. */
    tone?: ProgressTone
    /** Draw the fill as separate blocks, like the game's morale meter. */
    segmented?: boolean
    /** Text on the left above the bar, usually the meter name. */
    label?: React.ReactNode
    /** Text on the right above the bar, usually the value and a state word. */
    valueLabel?: React.ReactNode
  }) {
  const bar = (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-tone={tone}
      data-segmented={segmented || undefined}
      value={value}
      className={cn(progressVariants({ size }), className)}
      style={{ '--c': progressTones[tone] } as React.CSSProperties}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          'size-full flex-1 bg-(--c) shadow-[inset_0_-4px_0_rgb(0_0_0/.25)] transition-all',
          segmented && 'mask-[repeating-linear-gradient(90deg,#000_0_8px,transparent_8px_10px)]',
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )

  if (label == null && valueLabel == null) return bar

  return (
    <div data-slot="progress-field" className="flex w-full flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-[0.85rem] leading-none">
        <span className="font-heading font-bold tracking-[0.07em] text-fg-2 uppercase">
          {label}
        </span>
        <span className="tabular-nums">{valueLabel}</span>
      </div>
      {bar}
    </div>
  )
}

export { Progress, progressVariants, progressTones }
export type { ProgressTone }
