import * as React from 'react'
import { cn } from 'cn'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'field-game h-[2.1rem] w-full min-w-0 rounded-none px-[0.6rem] py-1 text-base tabular-nums transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-fg-3 focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-btn-off disabled:text-btn-off-fg aria-invalid:border-bad aria-invalid:shadow-[0_0_0_1px_var(--bad)] md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
