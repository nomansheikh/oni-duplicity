import { proxy, transfer, wrap, type Remote } from 'comlink'
import type { SaveApi } from '../worker/save.worker.ts'

const worker = new Worker(new URL('../worker/save.worker.ts', import.meta.url), { type: 'module' })
const remote: Remote<SaveApi> = wrap<SaveApi>(worker)

export async function loadSave(file: File, onProgress: (fraction: number) => void) {
  const buffer = await file.arrayBuffer()
  return remote.load(transfer(buffer, [buffer]), file.name, proxy(onProgress))
}

export const saveClient = remote

export function downloadBytes(bytes: Uint8Array, fileName: string): void {
  const url = URL.createObjectURL(
    new Blob([bytes as BlobPart], { type: 'application/octet-stream' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
