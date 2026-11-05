import * as React from 'react'
import { cn } from 'cn'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer relative flex size-[1.4rem] shrink-0 items-center justify-center rounded-none border border-ink bg-inset shadow-[0_0_0_1px_var(--edge),inset_0_0_0_1px_#3a3f52] transition-colors outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-bad',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="block h-[0.6rem] w-[0.95rem] -translate-y-[2px] -rotate-45 border-b-[3px] border-l-[3px] border-[#5cc844] transition-none"
      />
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
