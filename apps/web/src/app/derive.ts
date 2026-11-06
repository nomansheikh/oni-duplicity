import type { Summary } from '@/worker/model'
import type { Views } from './types'

export function headerFile(summary: Summary) {
  return {
    name: summary.fileName,
    colony: summary.baseName,
    cycle: summary.cycles,
    version: summary.version,
  }
}

export function tabCounts(views: Views) {
  return {
    duplicants: views.duplicants.length,
    geysers: views.geysers.length,
    resources: views.materials.length,
    critters: views.critters.length,
    asteroids: views.worlds.length,
    stories: views.stories.length,
  }
}
