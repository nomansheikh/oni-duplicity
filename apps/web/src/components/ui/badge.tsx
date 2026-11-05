import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Slot } from 'radix-ui'

// Chip look: square, 1px tone border, tinted fill. `--c` carries the tone.
const badgeVariants = cva(
  'group/badge chip w-fit shrink-0 justify-center overflow-hidden rounded-none whitespace-nowrap transition-colors focus-visible:outline-2 aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: '[--c:var(--tab-on)]',
        secondary: '[--c:var(--fg-2)]',
        destructive: '[--c:var(--bad)]',
        outline: 'bg-transparent [--c:var(--fg-2)]',
        ghost: 'border-transparent bg-transparent [--c:var(--fg-2)]',
        link: 'border-transparent bg-transparent font-sans text-[0.85rem] font-normal tracking-normal text-gold normal-case underline-offset-4 hover:underline [--c:var(--gold)]',
        // status
        good: '[--c:var(--cat-good)]',
        warn: '[--c:var(--cat-warn)]',
        bad: '[--c:var(--cat-bad)]',
        info: '[--c:var(--cat-info)]',
        // resources
        oxygen: '[--c:var(--cat-oxygen)]',
        water: '[--c:var(--cat-water)]',
        food: '[--c:var(--cat-food)]',
        power: '[--c:var(--cat-power)]',
        metal: '[--c:var(--cat-metal)]',
        plant: '[--c:var(--cat-plant)]',
        critter: '[--c:var(--cat-critter)]',
        geyser: '[--c:var(--cat-geyser)]',
        dlc: '[--c:var(--cat-dlc)]',
        // elements
        gas: '[--c:var(--cat-gas)]',
        liquid: '[--c:var(--cat-liquid)]',
        solid: '[--c:var(--cat-solid)]',
        vacuum: '[--c:var(--cat-vacuum)]',
        // colony row: icon, number and unit, no border or background
        bare: 'h-auto min-h-0 gap-1.5 border-transparent bg-transparent px-0 font-sans text-base font-normal tracking-normal text-white normal-case [&>svg]:size-5!',
        // stat pill: dark inset box, numbers in tabular figures
        stat: 'h-[1.9rem] gap-[0.45rem] border-ink bg-inset px-[0.6rem] font-sans text-[0.9rem] font-semibold tracking-normal text-foreground normal-case tabular-nums',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
