import * as React from 'react'
import { cn } from 'cn'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'field-game flex field-sizing-content min-h-16 w-full rounded-none px-[0.6rem] py-2 type-body transition-colors outline-none placeholder:text-fg-3 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-btn-off disabled:text-btn-off-fg aria-invalid:border-bad',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
