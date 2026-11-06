/** What a geyser emits, for the category colour. Types the editor doesn't know get none. */
type Emits = 'gas' | 'liquid' | 'metal' | 'solid'

const EMITS: Record<string, Emits> = {
  steam: 'gas',
  hot_steam: 'gas',
  hot_co2: 'gas',
  hot_hydrogen: 'gas',
  hot_po2: 'gas',
  slimy_po2: 'gas',
  chlorine_gas: 'gas',
  chlorine_gas_cool: 'gas',
  methane: 'gas',
  hot_water: 'liquid',
  slush_water: 'liquid',
  filthy_water: 'liquid',
  slush_salt_water: 'liquid',
  salt_water: 'liquid',
  liquid_co2: 'liquid',
  liquid_sulfur: 'liquid',
  murky_brine: 'liquid',
  oil_drip: 'liquid',
  small_volcano: 'solid',
  big_volcano: 'solid',
}

export function emitsOf(prefab: string): Emits | undefined {
  const id = prefab.replace(/^GeyserGeneric_/, '')
  return EMITS[id] ?? (id.startsWith('molten_') ? 'metal' : undefined)
}
