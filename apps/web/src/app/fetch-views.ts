import { saveClient } from '@/lib/save-client'
import type { Summary } from '@/worker/model'
import type { Views } from './types'

/** Reads the summary and every view from the worker in one round. */
export async function fetchViews(): Promise<{ summary: Summary; views: Views }> {
  const [
    summary,
    duplicants,
    geysers,
    materials,
    critters,
    techs,
    gameSettings,
    worlds,
    stories,
    destinations,
  ] = await Promise.all([
    saveClient.summary(),
    saveClient.duplicants(),
    saveClient.geysers(),
    saveClient.materials(),
    saveClient.critters(),
    saveClient.techs(),
    saveClient.gameSettings(),
    saveClient.worlds(),
    saveClient.stories(),
    saveClient.destinations(),
  ])
  return {
    summary,
    views: {
      duplicants,
      geysers,
      materials,
      critters,
      techs,
      gameSettings,
      worlds,
      stories,
      destinations,
    },
  }
}
