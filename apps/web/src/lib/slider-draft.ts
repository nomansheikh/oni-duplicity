/**
 * What a controlled slider that only saves on commit shows while a drag is in flight.
 *
 * Dragging moves the thumb before the new value comes back, so the slider holds the dragged
 * position as a draft, tagged with the value it was dragged away from.
 */
export interface SliderDraft {
  values: number[]
  /** The controlled value when the drag moved the thumb, as `valueKey` gives it. */
  from: string
}

export function valueKey(value: readonly number[] | undefined): string {
  return value?.join(',') ?? ''
}

/**
 * The values the slider shows. While the pointer is held the draft wins, because a value that
 * arrives mid-drag may be the answer to an earlier edit. Once released, the draft only stands
 * while the controlled value is still the one it was dragged away from: any new value, from
 * this drag's commit or from anywhere else, replaces it.
 *
 * Deciding this from the value instead of waiting for a commit matters: a drag that ends where
 * it started commits nothing, and must not leave the thumb pinned there for later changes.
 */
export function shownSliderValues(
  value: number[] | undefined,
  draft: SliderDraft | undefined,
  held: boolean,
): number[] | undefined {
  if (!value || !draft) return value
  return held || draft.from === valueKey(value) ? draft.values : value
}
