import { LAYERS, sprite, type Layer, type PortraitParts } from './sprites'

/** Where each layer sits relative to the head's centre, as in the original DuplicantContainer. */
const PLACEMENT: Record<Layer, { left: number; top: number; rotate?: number }> = {
  headshape: { left: 0, top: 0 },
  eyes: { left: 10, top: -80, rotate: -12 },
  hair: { left: 7, top: -120 },
}

/** A duplicant head drawn from its accessories, scaled to fit a `size`×`size` box. */
export function Portrait({ parts, size }: { parts: PortraitParts; size: number }) {
  // The head spans roughly 300 units; centre it slightly low so the hair fits above.
  const scale = size / 300
  return (
    <div className="relative overflow-hidden" style={{ width: size, height: size }} aria-hidden>
      <div
        className="absolute"
        style={{
          left: size / 2,
          top: size * 0.58,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {LAYERS.map((layer) => {
          const s = sprite(layer, parts[layer])
          if (!s) return null
          const [ox, oy, width, height] = s.frame
          const place = PLACEMENT[layer]
          return (
            <img
              key={layer}
              src={s.src}
              alt=""
              draggable={false}
              className="absolute max-w-none select-none"
              style={{
                left: place.left,
                top: place.top,
                width,
                height,
                marginLeft: -width / 2 + ox,
                marginTop: -height / 2 + oy,
                transform: place.rotate ? `rotate(${place.rotate}deg)` : undefined,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
