import { fmt } from '@/lib/format'

/** Kilograms per second, in grams below one. */
export function fmtRate(kgPerSecond: number): string {
  return kgPerSecond >= 1 ? `${fmt(kgPerSecond, 2)} kg/s` : `${fmt(kgPerSecond * 1000, 0)} g/s`
}
