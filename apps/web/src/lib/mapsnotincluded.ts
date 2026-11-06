const EXPLORER = 'https://mapsnotincluded.org/map-explorer/'

/** The Mapsnotincluded page for a seed coordinate: the one place that site's address is built. */
export function mapsNotIncludedLink(coordinate: string): string {
  return `${EXPLORER}${encodeURIComponent(coordinate)}`
}
