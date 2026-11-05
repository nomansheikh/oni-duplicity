'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Toggle as TogglePrimitive } from 'radix-ui'

const toggleVariants = cva(
  "group/toggle tab justify-center gap-1 rounded-none whitespace-nowrap transition-colors outline-none shadow-[inset_0_-2px_0_rgb(0_0_0/.18)] hover:bg-tab-hi focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:bg-btn-off disabled:text-btn-off-fg aria-invalid:border-destructive aria-pressed:bg-tab-on aria-pressed:text-on-tab data-[state=on]:bg-tab-on data-[state=on]:text-on-tab data-[state=on]:hover:bg-tab-on [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: '',
        outline: 'shadow-[0_0_0_1px_var(--edge)]',
      },
      size: {
        default:
          'h-[1.9rem] min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        sm: "h-7 min-w-7 px-2.5 text-small has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-[2.6rem] min-w-10 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Toggle({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
