/**
 * Extracts sprite placement (origin, size) for duplicant portrait layers from the
 * react-oni-duplicant package's build data into src/components/portrait/frames.json.
 * Only metadata is generated; the images themselves are imported from the package.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { runInNewContext } from 'node:vm'

const require = createRequire(import.meta.url)
const root = dirname(require.resolve('react-oni-duplicant/package.json'))

interface Frame {
  origin: { x: number; y: number }
  width: number
  height: number
}
interface Symbol {
  decodedName?: string
  frames: Frame[]
}

function readBuild(file: string): { symbols: Symbol[] } {
  const text = readFileSync(join(root, 'dist/assets', file), 'utf8')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('};') + 1
  // The build data is a plain object literal; evaluate it in an empty context.
  return runInNewContext(`(${text.slice(start, end)})`) as { symbols: Symbol[] }
}

const builds = [readBuild('_head_swap_build.js'), readBuild('_body_swap_build.js')]
const layers = { hair: 33, headshape: 4, eyes: 5, body: 4 }
const frames: Record<string, Record<string, [number, number, number, number]>> = {}

for (const [layer, count] of Object.entries(layers)) {
  frames[layer] = {}
  for (let n = 1; n <= count; n++) {
    const id = String(n).padStart(3, '0')
    const symbol = builds.flatMap((b) => b.symbols).find((s) => s.decodedName === `${layer}_${id}`)
    const frame = symbol?.frames[0]
    if (!frame) throw new Error(`No frame for ${layer}_${id}`)
    frames[layer][id] = [frame.origin.x, frame.origin.y, frame.width, frame.height]
  }
}

writeFileSync(
  new URL('../src/components/portrait/frames.json', import.meta.url),
  `${JSON.stringify(frames)}\n`,
)
console.log(
  Object.entries(frames)
    .map(([k, v]) => `${k}: ${Object.keys(v).length}`)
    .join(', '),
)
