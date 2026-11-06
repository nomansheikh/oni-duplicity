import data from './generated/names.json' with { type: 'json' }

const prefabs = data.prefabs as Record<string, string>
const destinations = data.destinations as Record<string, string>

/** The key worldgen tags and the game's strings share: upper case, without underscores. */
const key = (tag: string) => tag.toUpperCase().replaceAll('_', '')

/** The game's display name of a building or creature prefab such as `GeneShuffler`. */
export const findPrefabName = (tag: string): string | undefined => prefabs[key(tag)]

/** The game's display name of a base-game space destination type such as `HeliumGiant`. */
export const findDestinationName = (id: string): string | undefined => destinations[id]
