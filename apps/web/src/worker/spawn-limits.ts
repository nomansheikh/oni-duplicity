/**
 * The most a single chunk may hold. `PrimaryElement.SanitizeMassAndTemperature` resets a heavier
 * chunk to its element's default mass on load, and `SetMass` clamps to it
 * (`PrimaryElement.cs:182`, `:211-219`, `MAX_MASS` at `:516`).
 */
export const MAX_CHUNK_MASS = 100_000

/** `PrimaryElement.OnDeserialized` resets a temperature outside 0..10,000 K (`PrimaryElement.cs:117`, `:177`). */
export const MAX_KELVIN = 10_000

/** At most this many chunks per spawn, so one edit stays reviewable: 1,000 t. */
export const MAX_SPAWN_CHUNKS = 10
export const MAX_SPAWN_MASS = MAX_CHUNK_MASS * MAX_SPAWN_CHUNKS
