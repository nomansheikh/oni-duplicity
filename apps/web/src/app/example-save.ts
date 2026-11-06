// The owner's CC0 colony (test-data/README.md), bundled by Vite so the fixture stays the one copy.
import exampleUrl from '../../../../test-data/saves/beautiful-galaxy-build-744825.sav?url'

/** The name the example opens under, so the loading screen says it is the example. */
export const EXAMPLE_FILE_NAME = 'example-beautiful-galaxy.sav'

/** Downloads the example save as a File, reporting progress from 0 to 1 when the size is known. */
export async function fetchExampleSave(onProgress: (progress: number) => void): Promise<File> {
  const response = await fetch(exampleUrl)
  if (!response.ok || !response.body) {
    throw new Error(`Could not download the example save (${response.status})`)
  }
  const total = Number(response.headers.get('content-length')) || 0
  const reader = response.body.getReader()
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    if (total) onProgress(Math.min(received / total, 1))
  }
  onProgress(1)
  return new File(chunks, EXAMPLE_FILE_NAME, { type: 'application/octet-stream' })
}
