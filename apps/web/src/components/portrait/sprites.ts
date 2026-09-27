import frameData from './frames.json'

// Sprites come from the react-oni-duplicant package (the art the original Duplicity used).
const images = import.meta.glob<string>(
  '/node_modules/react-oni-duplicant/assets/duplicant/*/*/*_0.png',
  { eager: true, query: '?url', import: 'default' },
)

/** [originX, originY, width, height] per layer and style number. */
const frames = frameData as unknown as Record<
  string,
  Record<string, [number, number, number, number]>
>

export type Layer = 'hair' | 'headshape' | 'eyes'

export const LAYERS: Layer[] = ['headshape', 'eyes', 'hair']

export interface PortraitParts {
  hair?: string
  headshape?: string
  eyes?: string
}

export function sprite(layer: Layer, number: string | undefined) {
  if (!number) return null
  const frame = frames[layer]?.[number]
  const src =
    images[
      `/node_modules/react-oni-duplicant/assets/duplicant/${layer}/${layer}_${number}/${layer}_${number}_0.png`
    ]
  return frame && src ? { frame, src } : null
}

/** True when every layer has art; otherwise callers show a fallback. */
export function canDrawPortrait(parts: PortraitParts): boolean {
  return LAYERS.every((layer) => sprite(layer, parts[layer]) !== null)
}
