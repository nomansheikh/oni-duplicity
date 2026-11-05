// A fixed workload, timed next to the real phases. It is deliberately independent of the parser
// and of fflate, so a regression in either cannot hide by slowing the calibration too.
// It resembles what they do, which is dominated by memory rather than arithmetic: stream through a
// buffer far larger than the CPU caches, and allocate many small objects and strings.

const BUFFER_BYTES = 256 << 20
const OBJECTS = 1_500_000

interface Node {
  id: number
  name: string
  next: Node | null
}

function streamBuffer(): number {
  const words = new Uint32Array(BUFFER_BYTES / 4)
  let state = 0x9e3779b9
  // Sequential writes.
  for (let i = 0; i < words.length; i++) {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    words[i] = state
  }
  // Sequential reads, through a typed array and through an unaligned DataView.
  let sum = 0
  for (let i = 0; i < words.length; i++) sum = (sum + words[i]!) | 0
  const view = new DataView(words.buffer)
  for (let i = 1; i + 4 <= BUFFER_BYTES; i += 16) sum = (sum + view.getUint32(i, true)) | 0
  return sum
}

function allocateObjects(): number {
  const nodes: Node[] = []
  let previous: Node | null = null
  for (let i = 0; i < OBJECTS; i++) {
    const node: Node = { id: i, name: `item-${i & 0xfff}-${i}`, next: previous }
    nodes.push(node)
    previous = node
  }
  let sum = 0
  for (const node of nodes) sum = (sum + node.id + node.name.length) | 0
  return sum
}

/** Returns a checksum so the work cannot be optimized away. */
export function calibrationWorkload(): number {
  return (streamBuffer() + allocateObjects()) | 0
}
