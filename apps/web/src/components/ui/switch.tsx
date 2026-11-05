import * as React from 'react'
import { cn } from 'cn'
import { Switch as SwitchPrimitive } from 'radix-ui'

function Switch({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default'
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer group/switch relative inline-flex shrink-0 items-center rounded-none border border-ink bg-inset px-[0.2rem] shadow-[0_0_0_1px_var(--edge)] transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:outline-2 focus-visible:outline-ring aria-invalid:border-bad data-[size=default]:h-[1.55rem] data-[size=default]:w-12 data-[size=sm]:h-[1.2rem] data-[size=sm]:w-9 data-checked:bg-[#1d3a26] data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-none bg-[#9a9eb0] transition-transform group-data-[size=default]/switch:h-[1.05rem] group-data-[size=default]/switch:w-[1.1rem] group-data-[size=sm]/switch:h-3 group-data-[size=sm]/switch:w-3.5 group-data-[size=default]/switch:data-checked:translate-x-[1.35rem] group-data-[size=sm]/switch:data-checked:translate-x-[1.1rem] data-checked:bg-m-good data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
