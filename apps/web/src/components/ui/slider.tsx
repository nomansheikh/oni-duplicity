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
        className="relative grow overflow-hidden rounded-none border-[3px] border-[#607470] bg-[#302820] bg-[linear-gradient(90deg,rgb(255_255_255/.14)_1px,transparent_1px)] bg-size-[10%_100%] outline-1 outline-ink data-horizontal:h-[1.55rem] data-horizontal:w-full data-vertical:h-full data-vertical:w-[1.55rem]"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-[linear-gradient(#5cd418,#50c800)] select-none data-horizontal:inset-y-0.5 data-horizontal:left-0.5 data-vertical:inset-x-0.5"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="relative block size-[1.4rem] shrink-0 rounded-none border border-ink bg-btn shadow-[inset_0_-2px_0_rgb(0_0_0/.25)] transition-colors select-none after:absolute after:-inset-2 hover:bg-btn-hi focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
