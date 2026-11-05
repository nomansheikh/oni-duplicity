/** A number the user types; empty, negative or invalid reads as 0. */
export function parseDemand(text: string): number {
  const n = Number(text)
  return Number.isFinite(n) && n > 0 ? n : 0
}
