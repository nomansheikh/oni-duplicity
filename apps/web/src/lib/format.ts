export const fmt = (n: number, digits = 1) =>
  n.toLocaleString(undefined, { maximumFractionDigits: digits })

/** `Mining3` → `Mining 3`, `hat_role_mining3` → `Hat Role Mining 3`. */
export function humanize(id: string): string {
  return id
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Portrait layers from a duplicant's appearance slots. */
export function portraitParts(appearance: { slot: string; current: string }[]) {
  const get = (slot: string) => appearance.find((a) => a.slot === slot)?.current
  return { hair: get('hair'), headshape: get('headshape'), eyes: get('eyes') }
}
