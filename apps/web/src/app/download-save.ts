import { toast } from 'sonner'
import { downloadBytes, saveClient } from '@/lib/save-client'

/** Saves the edited file and hands it to the browser, reporting the outcome in a toast. */
export async function downloadCurrentSave() {
  try {
    // The worker handles messages in order, so this name includes every edit
    // already sent, even while the views are still refreshing.
    const [bytes, { baseName }] = await Promise.all([saveClient.save(), saveClient.summary()])
    downloadBytes(bytes, `${baseName}.sav`)
    toast.success('Save downloaded')
  } catch (error) {
    toast.error((error as Error).message)
  }
}
