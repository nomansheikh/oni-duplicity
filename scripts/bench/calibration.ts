// A fixed CPU workload, timed next to the real phases. It is deliberately independent of the
// parser and of fflate, so a regression in either cannot hide by slowing the calibration too.
// It mimics what they do: walk bytes with a DataView, allocate many small objects and strings,
// and run a deflate-like hash-table match search.

const SIZE = 4 << 20
const HASH_BITS = 15
const HASH_MASK = (1 << HASH_BITS) - 1

function makeData(): Uint8Array {
  const data = new Uint8Array(SIZE)
  let state = 0x9e3779b9
  for (let i = 0; i < SIZE; i++) {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    // A small alphabet with repeated stretches, so the match search finds matches.
    data[i] = i % 64 < 24 ? data[i - (i % 64)]! : (state >>> 24) & 0x1f
  }
  return data
}

const data = makeData()
const view = new DataView(data.buffer)
const decoder = new TextDecoder('utf-8')

function walkRecords(): number {
  const records: { id: number; name: string; value: number }[] = []
  for (let pos = 0; pos + 24 <= SIZE && records.length < 300_000; pos += 12 + (data[pos]! & 7)) {
    const length = data[pos + 1]! & 15
    records.push({
      id: view.getUint32(pos, true),
      name: decoder.decode(data.subarray(pos + 2, pos + 2 + length)),
      value: view.getInt16(pos + 8, true),
    })
  }
  let sum = 0
  for (const record of records) sum = (sum + record.id + record.name.length + record.value) | 0
  return sum
}

function matchSearch(): number {
  const head = new Int32Array(1 << HASH_BITS).fill(-1)
  const prev = new Int32Array(SIZE)
  let matched = 0
  for (let i = 0; i < SIZE - 3; i++) {
    const hash = ((data[i]! << 10) ^ (data[i + 1]! << 5) ^ data[i + 2]!) & HASH_MASK
    const candidate = head[hash]!
    if (candidate >= 0) {
      let length = 0
      while (length < 32 && i + length < SIZE && data[candidate + length] === data[i + length]) {
        length++
      }
      matched += length
    }
    prev[i] = candidate
    head[hash] = i
  }
  return matched
}

/** Returns a checksum so the work cannot be optimized away. */
export function calibrationWorkload(): number {
  let checksum = 0
  for (let i = 0; i < 3; i++) checksum = (checksum + walkRecords() + matchSearch()) | 0
  return checksum
}
