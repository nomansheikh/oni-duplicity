import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Slot } from 'radix-ui'

const buttonVariants = cva(
  "group/button btn-game shrink-0 rounded-none whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring shadow-[inset_0_-1px_0_rgb(0_0_0/.3)] hover:bg-(--hi) active:bg-(--lo) active:pt-[2px] active:shadow-[inset_0_2px_0_rgb(0_0_0/.4)] disabled:pointer-events-none disabled:bg-btn-off disabled:text-btn-off-fg aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: '[--bg:var(--btn-grey)] [--hi:var(--btn-grey-hi)] [--lo:var(--btn-grey-lo)]',
        secondary: '[--bg:var(--btn)] [--hi:var(--btn-hi)] [--lo:var(--btn-lo)]',
        outline: '[--bg:var(--tab)] [--hi:var(--tab-hi)] [--lo:var(--inset)]',
        accent: '[--bg:var(--title)] [--hi:var(--title-hi)] [--lo:var(--title-lo)]',
        ghost:
          'border-transparent shadow-none [--bg:transparent] [--hi:var(--tab-hi)] [--lo:var(--inset)] aria-expanded:bg-(--hi) active:shadow-none',
        destructive: '[--bg:#962a28] [--hi:#b0302d] [--lo:#6f1f1e]',
        link: 'border-transparent shadow-none active:shadow-none [--bg:transparent] [--hi:transparent] [--lo:transparent] font-sans font-normal normal-case tracking-normal text-gold underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-[1.9rem] gap-1.5 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 px-2 text-caption has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 text-small has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-[2.6rem] gap-2 px-5 text-h3 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        icon: 'size-[1.9rem] px-0',
        'icon-xs': "size-6 px-0 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-7 px-0',
        'icon-lg': 'size-[2.6rem] px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
