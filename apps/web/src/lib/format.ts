export const DLC_NAMES: Record<string, string> = {
  EXPANSION1_ID: 'Spaced Out',
  DLC2_ID: 'Frosty Planet',
  DLC3_ID: 'Bionic Booster',
  DLC4_ID: 'Prehistoric Planet',
  DLC5_ID: 'DLC5',
}

export const fmt = (n: number, digits = 1) =>
  n.toLocaleString(undefined, { maximumFractionDigits: digits })

/** `Mining3` → `Mining 3`, `hat_role_mining3` → `Hat Role Mining 3`. */
export function humanize(id: string): string {
  return id
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
