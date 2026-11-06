import { destinationTypes } from '@/lib/space-destinations'

/**
 * Kilometres the starmap screen shows for a destination: its tier plus one, times 10,000
 * (`StarmapScreen`: `OneBasedDistance * 10000f`, with `SpaceDestination.OneBasedDistance` being
 * `distance + 1`). The generator reports the zero-based `distance`.
 */
export function destinationKm(distance: number): number {
  return (distance + 1) * 10000
}

export interface DestinationMass {
  /** Kilograms the destination holds when full: the game's "Current mass" for a new world. */
  total: number
  /** Kilograms that can be taken from it (`SpaceDestination.AvailableMass`, `max - min`). */
  recoverable: number
}

/** What the game shows for a destination type: its mass, and how much of it can be recovered. */
export function destinationMass(type: string): DestinationMass | undefined {
  const entry = destinationTypes.find((t) => t.id === type)
  return entry && { total: entry.max, recoverable: entry.max - entry.min }
}
