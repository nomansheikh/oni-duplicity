'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Tabs as TabsPrimitive } from 'radix-ui'

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn('group/tabs flex gap-2 data-horizontal:flex-col', className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  'group/tabs-list inline-flex w-fit max-w-full items-center overflow-x-auto text-muted-foreground group-data-horizontal/tabs:min-h-[1.9rem] group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col',
  {
    variants: {
      // strip: the game's top tab strip, separate tabs 3px apart
      // line: same tabs, tighter, for sub-navigation inside a panel
      variant: {
        default: 'gap-[3px] bg-transparent p-0',
        line: 'gap-px bg-transparent p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function TabsList({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "tab shrink-0 justify-center rounded-none whitespace-nowrap transition-colors group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start shadow-[inset_0_-2px_0_rgb(0_0_0/.18)] hover:bg-tab-hi disabled:pointer-events-none disabled:opacity-50 data-active:bg-tab-on data-active:text-on-tab data-active:shadow-[inset_0_-2px_0_rgb(0_0_0/.28)] group-data-[variant=line]/tabs-list:px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_[data-slot=tab-count]]:bg-black/30 [&_[data-slot=tab-count]]:px-1.5 [&_[data-slot=tab-count]]:type-caption",
        'data-active:hover:bg-tab-on',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 type-body outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
