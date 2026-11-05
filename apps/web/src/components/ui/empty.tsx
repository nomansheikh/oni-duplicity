import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

const emptyVariants = cva(
  'group/empty relative flex w-full min-w-0 flex-1 flex-col items-center justify-center border border-ink bg-well text-center text-balance shadow-[inset_0_0_0_2px_var(--ground),inset_0_6px_14px_rgb(0_0_0/0.35)]',
  {
    variants: {
      size: {
        default: 'min-h-48 gap-4 p-8',
        compact: 'gap-3 p-4',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

function Empty({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyVariants>) {
  return (
    <div
      data-slot="empty"
      data-size={size}
      className={cn(emptyVariants({ size }), className)}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-header"
      className={cn('flex max-w-sm flex-col items-center gap-1.5', className)}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  'flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        // a hex badge: ink outline, inset fill, primary glyph
        icon: "relative size-16 bg-ink text-primary [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)] before:absolute before:content-[''] before:inset-[2px] before:bg-inset before:[clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)] group-data-[size=compact]/empty:size-11 [&_svg]:relative [&_svg]:size-7 group-data-[size=compact]/empty:[&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function EmptyMedia({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-title"
      className={cn('type-h3 uppercase text-foreground', className)}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        'type-small text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        className,
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        'flex w-full max-w-sm min-w-0 flex-col items-center gap-2.5 text-sm text-balance',
        className,
      )}
      {...props}
    />
  )
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia }
