import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Progress as ProgressPrimitive } from 'radix-ui'

type ProgressTone = 'good' | 'warn' | 'bad'
type MeterKind = 'amount' | 'health' | 'stress'

/**
 * Tone for a value, by the rules in docs/design.md: amounts are good from 50% and warn from
 * 25%, health 70/35, stress is good up to 40% and warn up to 70% (higher is worse).
 */
function meterTone(kind: MeterKind, pct: number): ProgressTone {
  if (kind === 'stress') return pct <= 40 ? 'good' : pct <= 70 ? 'warn' : 'bad'
  const [good, warn] = kind === 'health' ? [70, 35] : [50, 25]
  return pct >= good ? 'good' : pct >= warn ? 'warn' : 'bad'
}

const bevel = (c: string) =>
  `inset 0 1px 0 color-mix(in srgb,${c} 38%,#000),inset 0 -1px 0 color-mix(in srgb,${c} 43%,#000),inset -2px 0 0 color-mix(in srgb,${c} 66%,#000),inset 0 -2px 0 color-mix(in srgb,${c} 66%,#000),inset 0 -3px 0 color-mix(in srgb,${c} 90%,#000)`

// blocks: the morale meter. gauge: the in-world storage gauge. xp: the skill XP bar.
// task: the in-world task bar (research, geyser). Tone sets --c (blocks) and --gf1/--gf2 (gauge).
const progressVariants = cva('relative w-full', {
  variants: {
    variant: {
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
  defaultVariants: { variant: 'gauge', tone: 'good' },
})

const stateColor: Record<ProgressTone, string> = {
  good: 'text-m-good',
  warn: 'text-m-warn',
  bad: 'text-m-bad',
}

function Progress({
  className,
  value = 0,
  variant = 'gauge',
  tone = 'good',
  segments = 20,
  overflow = 0,
  dormant,
  marker,
  label,
  state,
  valueLabel,
  ...props
}: Omit<React.ComponentProps<typeof ProgressPrimitive.Root>, 'children'> &
  VariantProps<typeof progressVariants> & {
    /** blocks: how many cells the track has. */
    segments?: number
    /** Amount above the maximum. blocks adds 3 amber cells, gauge adds a hatched cap, and `+N` shows in the header. */
    overflow?: number
    /** task: width in percent of the dormant part drawn after the fill (geyser). */
    dormant?: number
    /** task: position in percent of the white "now" marker (geyser). */
    marker?: number
    /** Header, left: the meter name and value, such as "Stress: 82 %". */
    label?: React.ReactNode
    /** Header, right: a state word (blocks, gauge) or a readout (task). */
    state?: React.ReactNode
    /** xp: the text centred on the bar, such as "14145 / 17545". */
    valueLabel?: React.ReactNode
  }) {
  const pct = Math.max(0, Math.min(100, value ?? 0))
  const extra = overflow > 0 ? 3 : 0

  const bar = (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-variant={variant}
      data-tone={tone}
      value={value}
      className={cn(progressVariants({ variant, tone }), className)}
      style={
        variant === 'blocks'
          ? { gridTemplateColumns: `repeat(${segments + extra},minmax(0,1fr))` }
          : undefined
      }
      {...props}
    >
      {variant === 'blocks' &&
        Array.from({ length: segments + extra }, (_, i) => {
          const over = i >= segments
          const filled = over || i < Math.round((pct / 100) * segments)
          return (
            <span
              key={i}
              data-slot="progress-cell"
              data-filled={filled || undefined}
              className={cn(
                'h-[22px] border',
                filled ? 'border-[#020303] bg-(--c)' : 'border-black/50 bg-black/25',
              )}
              style={
                filled
                  ? ({
                      '--c': over ? '#d9a63a' : undefined,
                      boxShadow: bevel('var(--c)'),
                    } as React.CSSProperties)
                  : undefined
              }
            />
          )
        })}

      {variant === 'gauge' && (
        <>
          <ProgressPrimitive.Indicator
            data-slot="progress-indicator"
            className="absolute inset-y-0.5 left-0.5 bg-[linear-gradient(var(--gf1),var(--gf2))]"
            style={{ width: `calc(${pct}% - 4px)` }}
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(90deg,rgb(255_255_255/.14)_1px,transparent_1px)] bg-size-[10%_100%]"
          />
          {extra > 0 && (
            <span
              aria-hidden
              data-slot="progress-cap"
              className="absolute inset-y-0 right-0 w-[0.6rem] bg-[repeating-linear-gradient(45deg,#d9a63a_0_3px,#6b4a10_3px_6px)]"
            />
          )}
        </>
      )}

      {variant === 'xp' && (
        <>
          <ProgressPrimitive.Indicator
            data-slot="progress-indicator"
            className="absolute inset-y-0 left-0 bg-[#6e4057]"
            style={{ width: `${pct}%` }}
          />
          <span className="absolute inset-0 grid place-items-center font-heading text-base font-semibold tracking-[0.06em] tabular-nums">
            {valueLabel}
          </span>
        </>
      )}

      {variant === 'task' && (
        <>
          <ProgressPrimitive.Indicator
            data-slot="progress-indicator"
            className="absolute inset-y-0 left-0 bg-[linear-gradient(#e3b27a_0_15%,#f2b052_15%_35%,#fab03e_35%_75%,#e1b079_75%)]"
            style={{ width: `${pct}%` }}
          />
          {dormant != null && (
            <span
              aria-hidden
              data-slot="progress-dormant"
              className="absolute inset-y-0 bg-[#6b6b6b]"
              style={{ left: `${pct}%`, width: `${dormant}%` }}
            />
          )}
          {marker != null && (
            <span
              aria-hidden
              data-slot="progress-marker"
              className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_#000]"
              style={{ left: `${marker}%` }}
            />
          )}
        </>
      )}
    </ProgressPrimitive.Root>
  )

  if (label == null && state == null && overflow <= 0) return bar

  return (
    <div data-slot="progress-field" className="flex w-full flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 leading-none">
        <span className="text-base text-white">{label}</span>
        <span className="flex items-baseline gap-2">
          {overflow > 0 && (
            <span className="text-[0.8rem] font-bold text-warn tabular-nums">
              +{overflow.toLocaleString()}
            </span>
          )}
          {state != null && (
            <span
              className={cn(
                'font-heading text-[0.8rem] font-bold tracking-[0.07em] uppercase',
                variant === 'task' ? 'text-fg-2' : stateColor[tone ?? 'good'],
              )}
            >
              {state}
            </span>
          )}
        </span>
      </div>
      {bar}
    </div>
  )
}

export { Progress, progressVariants, meterTone }
export type { ProgressTone, MeterKind }
