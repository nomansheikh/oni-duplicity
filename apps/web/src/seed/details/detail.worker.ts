import { describeMap, detailBuffers } from './extract-detail.ts'
import type { DescribeMessage, DescribeReply } from './protocol.ts'
import type { RawDetailMap } from './raw.ts'

type Worldgen = (typeof import('@onimaxxing/worldgen'))['worldgen']

let loading: Promise<Worldgen> | undefined

/** Loads the generator on the first request and keeps it for every later one. */
function load(): Promise<Worldgen> {
  loading ??= import('@onimaxxing/worldgen').then(async (module) => {
    await module.default({ threads: 'serial' })
    return module.worldgen
  })
  return loading
}

function reply(message: DescribeReply, transfer: ArrayBuffer[] = []): void {
  ;(self as unknown as Worker).postMessage(message, transfer)
}

self.onmessage = async (event: MessageEvent<DescribeMessage>) => {
  const { id, coordinate } = event.data
  try {
    const worldgen = await load()
    const map = worldgen.generate(coordinate) as unknown as RawDetailMap | { error: string }
    if ('error' in map) throw new Error(map.error)
    if (map.failure) throw new Error('This seed does not generate')
    if (map.coordinate !== coordinate)
      throw new Error('The generator made a different seed than asked for')
    const detail = describeMap(map, worldgen.version())
    reply({ type: 'detail', id, detail }, detailBuffers(detail))
  } catch (error) {
    reply({ type: 'error', id, message: error instanceof Error ? error.message : String(error) })
  }
}
