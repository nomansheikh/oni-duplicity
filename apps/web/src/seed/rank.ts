import type { SeedResult } from './result.ts'

/** The best `capacity` results, highest score first; among equals the earlier one stays ahead. */
export class TopList {
  private items: SeedResult[] = []
  private readonly capacity: number

  constructor(capacity: number) {
    this.capacity = capacity
  }

  /** Adds a result; false when it did not make the list (too low, or a duplicate coordinate). */
  insert(result: SeedResult): boolean {
    if (this.capacity <= 0) return false
    if (this.items.some((item) => item.coordinate === result.coordinate)) return false
    const last = this.items[this.items.length - 1]
    if (this.items.length >= this.capacity && last && result.score <= last.score) return false
    let index = this.items.findIndex((item) => item.score < result.score)
    if (index === -1) index = this.items.length
    this.items.splice(index, 0, result)
    if (this.items.length > this.capacity) this.items.pop()
    return true
  }

  list(): SeedResult[] {
    return [...this.items]
  }
}
