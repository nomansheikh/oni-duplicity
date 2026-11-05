import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

const cardVariants = cva(
  'group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-none text-sm text-card-foreground [--card-spacing:--spacing(3)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(2)] data-[size=sm]:has-data-[slot=card-footer]:pb-0',
  {
    variants: {
      // panel: framed slate panel; a CardHeader becomes the mauve title bar
      // well: darker section block with a plain header
      variant: {
        panel: 'panel pb-(--card-spacing)',
        well: 'well p-0 py-(--card-spacing)',
      },
    },
    defaultVariants: { variant: 'panel' },
  },
)

function Card({
  className,
  size = 'default',
  variant = 'panel',
  ...props
}: React.ComponentProps<'div'> & { size?: 'default' | 'sm' } & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header title-bar flex-wrap py-1.5 group-data-[variant=well]/card:min-h-0 group-data-[variant=well]/card:border-0 group-data-[variant=well]/card:bg-transparent group-data-[variant=well]/card:px-(--card-spacing) group-data-[variant=well]/card:py-0 group-data-[variant=well]/card:shadow-none [.border-b]:pb-1.5',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('type-title-bar group-data-[size=sm]/card:text-label', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        'basis-full type-small text-muted-foreground normal-case group-data-[variant=panel]/card:text-white/75',
        className,
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-action" className={cn('ml-auto self-center', className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" className={cn('px-(--card-spacing)', className)} {...props} />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center border-t border-ink bg-inset p-(--card-spacing)', className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
