'use client'

import * as React from 'react'
import { cn } from 'cn'
import { Slider as SliderPrimitive } from 'radix-ui'

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        'relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-none border border-ink bg-inset bg-[linear-gradient(90deg,rgb(255_255_255/.14)_1px,transparent_1px)] bg-size-[10%_100%] shadow-[0_0_0_1px_var(--edge)] data-horizontal:h-3.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-3.5"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-m-good select-none data-horizontal:h-full data-vertical:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="relative block h-6 w-[0.8rem] shrink-0 rounded-none border border-ink bg-tab-on transition-colors select-none after:absolute after:-inset-2 hover:bg-[#9aa4c8] focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
