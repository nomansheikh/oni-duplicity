// Value-level comparison of oni-save-parser (the oracle) against our parser.
//
// Only values are compared, never bytes or length prefixes: the two parsers write collection
// lengths differently, so neither re-reads the other's output. Representation differences
// (int64 shape, colours, buffers) are normalised; known structural differences are counted
// but not failures; anything else is a real disagreement.

export type Kind = 'representation' | 'known' | 'real'

export interface Entry {
  kind: Kind
  category: string
  /** Path pattern: indices and game-object names are collapsed. */
  pattern: string
  count: number
  /** First occurrence, with its full path and both values. */
  example: string
}

export interface Report {
  comparedValues: number
  entries: Entry[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Loose = any

const SAVE_PARTS = [
  'header',
  'templates',
  'version',
  'world',
  'settings',
  'simData',
  'gameData',
  'gameObjects',
] as const
const GROUP_KEYS = ['name', 'gameObjects']
const GAME_OBJECT_KEYS = ['position', 'rotation', 'scale', 'folder', 'behaviors']
const BEHAVIOR_KEYS = ['name', 'templateData', 'extraData', 'extraRaw']
const MACHINE_KEYS = ['leading', 'type', 'typeSuffix', 'currentState', 'data']

const KNOWN_SMC = 'StateMachineController decoded by the oracle only; re-encodes to our raw bytes'
const KNOWN_MODIFIERS = 'Modifiers list is called diseases by the oracle, sicknesses by us'

function pattern(path: string): string {
  return path.replace(/\[\d+\]/g, '[]').replace(/gameObjects<[^>]+>/g, 'gameObjects<*>')
}

function show(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, x) =>
      typeof x === 'bigint'
        ? `${x}n`
        : x instanceof ArrayBuffer || ArrayBuffer.isView(x)
          ? `<bytes ${x.byteLength}>`
          : x,
    )!.slice(0, 160)
  } catch {
    return String(value)
  }
}

function isLong(v: Loose): boolean {
  return (
    v !== null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.keys(v).length === 3 &&
    typeof v.unsigned === 'boolean' &&
    typeof v.lower === 'number' &&
    typeof v.upper === 'number'
  )
}

function longToBigInt(v: { unsigned: boolean; lower: number; upper: number }): bigint {
  const raw = (BigInt(v.upper) << 32n) | BigInt.asUintN(32, BigInt(v.lower))
  return v.unsigned ? BigInt.asUintN(64, raw) : BigInt.asIntN(64, raw)
}

const isBytes = (v: unknown): v is ArrayBuffer | ArrayBufferView =>
  v instanceof ArrayBuffer || ArrayBuffer.isView(v)

function toBytes(v: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (v instanceof Uint8Array) return v
  // A typed array or DataView must be read through its own window, not the whole buffer.
  if (ArrayBuffer.isView(v)) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength)
  return new Uint8Array(v)
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && Buffer.compare(a, b) === 0
}

const COLOUR_KEYS = ['r', 'g', 'b', 'a'] as const

function isColour(v: Loose): boolean {
  return (
    v !== null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.keys(v).sort().join() === 'a,b,g,r' &&
    Object.values(v).every((x) => typeof x === 'number')
  )
}

function int32(n: number): Buffer {
  const b = Buffer.alloc(4)
  b.writeInt32LE(n)
  return b
}

function kleiString(s: string | null): Buffer {
  if (s === null) return int32(-1)
  const encoded = Buffer.from(s, 'utf8')
  return Buffer.concat([int32(encoded.length), encoded])
}

/** Re-encodes the oracle's decoded StateMachineController to the bytes it was read from. */
export function encodeStateMachineController(x: Loose): Buffer {
  const parts: Buffer[] = [int32(x.serializerVersion)]
  if (!x.stateMachines) {
    parts.push(int32(x.unparsed.byteLength), Buffer.from(x.unparsed))
    return Buffer.concat(parts)
  }
  // Serializer 11 and 20+ carry a type suffix per machine.
  const hasSuffix = x.serializerVersion < 20 ? x.serializerVersion === 11 : true
  const body: Buffer[] = [int32(x.stateMachines.length)]
  for (const m of x.stateMachines) {
    body.push(int32(m.leading), kleiString(m.type))
    if (hasSuffix) body.push(kleiString(m.typeSuffix))
    body.push(kleiString(m.currentState), int32(m.data.byteLength), Buffer.from(m.data))
  }
  const bodyBuffer = Buffer.concat(body)
  parts.push(int32(bodyBuffer.length), bodyBuffer)
  return Buffer.concat(parts)
}

/** `theirs` is the oracle's save, `ours` is `parseSave`'s. */
export function compareSaves(theirs: Loose, ours: Loose): Report {
  const stats = new Map<string, Entry>()
  let comparedValues = 0

  function record(kind: Kind, category: string, path: string, detail: string): void {
    const key = `${kind}|${category}|${pattern(path)}`
    const entry = stats.get(key)
    if (entry) entry.count++
    else
      stats.set(key, {
        kind,
        category,
        pattern: pattern(path),
        count: 1,
        example: `${path}: ${detail}`,
      })
  }
  const real = (category: string, path: string, a: unknown, b: unknown) =>
    record('real', category, path, `theirs=${show(a)} ours=${show(b)}`)

  /** Any defined key outside `allowed` is something the comparison would otherwise never look at. */
  function checkKeys(value: Loose, allowed: readonly string[], side: string, path: string): void {
    for (const key of Object.keys(value)) {
      if (value[key] !== undefined && !allowed.includes(key)) {
        record('real', `unexpected key in ${side}`, `${path}.${key}`, show(value[key]))
      }
    }
  }

  function cmp(a: Loose, b: Loose, path: string): void {
    comparedValues++
    a ??= null
    b ??= null
    if (a === null || b === null) {
      if (a !== b) real('value differs', path, a, b)
      return
    }
    if (isLong(a)) {
      if (typeof b !== 'bigint') return real('int64 type mismatch', path, a, b)
      if (longToBigInt(a) === b)
        record('representation', 'int64 {unsigned,lower,upper} vs bigint', path, 'equal')
      else real('int64 differs', path, `${longToBigInt(a)}n`, `${b}n`)
      return
    }
    if (typeof a === 'bigint' || typeof b === 'bigint') return real('unexpected bigint', path, a, b)
    if (isBytes(a) || isBytes(b)) {
      if (!isBytes(a) || !isBytes(b)) return real('bytes vs non-bytes', path, a, b)
      if (!bytesEqual(toBytes(a), toBytes(b))) {
        return real('bytes differ', path, `${a.byteLength} bytes`, `${b.byteLength} bytes`)
      }
      if (a.constructor !== b.constructor) {
        record(
          'representation',
          `bytes ${a.constructor.name} vs ${b.constructor.name}`,
          path,
          'equal',
        )
      }
      return
    }
    if (isColour(a) && isColour(b) && !COLOUR_KEYS.every((k) => Object.is(a[k], b[k]))) {
      const same = COLOUR_KEYS.every(
        (k) => Number.isInteger(b[k]) && Math.round(a[k] * 255) === b[k],
      )
      if (same) record('representation', 'colour float 0..1 vs byte 0..255', path, 'equal')
      else real('colour differs', path, a, b)
      return
    }
    if (typeof a !== typeof b) return real('type mismatch', path, a, b)
    if (typeof a === 'number') {
      if (!Object.is(a, b) && !(Number.isNaN(a) && Number.isNaN(b)))
        real('number differs', path, a, b)
      return
    }
    if (typeof a !== 'object') {
      if (a !== b) real('primitive differs', path, a, b)
      return
    }
    if (Array.isArray(a) !== Array.isArray(b)) return real('array vs object', path, a, b)
    if (Array.isArray(a)) {
      if (a.length !== b.length) return real('array length differs', path, a.length, b.length)
      for (let i = 0; i < a.length; i++) cmp(a[i], b[i], `${path}[${i}]`)
      return
    }
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) {
      const inA = a[k] !== undefined
      const inB = b[k] !== undefined
      if (inA && inB) cmp(a[k], b[k], `${path}.${k}`)
      else if (inA) real('key only in oracle', `${path}.${k}`, a[k], undefined)
      else if (inB) real('key only in ours', `${path}.${k}`, undefined, b[k])
    }
  }

  function cmpBehavior(a: Loose, b: Loose, path: string): void {
    checkKeys(a, BEHAVIOR_KEYS, 'oracle behavior', path)
    checkKeys(b, BEHAVIOR_KEYS, 'our behavior', path)
    if (a.name !== b.name) return real('behavior name differs', path, a.name, b.name)
    cmp(a.templateData, b.templateData, `${path}.templateData`)
    const rawA = a.extraRaw ? toBytes(a.extraRaw) : new Uint8Array(0)
    const rawB = b.extraRaw ? toBytes(b.extraRaw) : new Uint8Array(0)

    if (a.name === 'StateMachineController') {
      if (a.extraData === undefined)
        return real('oracle left StateMachineController undecoded', path, undefined, undefined)
      if (b.extraData !== undefined)
        real('we decoded StateMachineController', path, undefined, b.extraData)
      if (rawA.length)
        real(
          'oracle kept raw StateMachineController bytes too',
          path,
          `${rawA.length} bytes`,
          undefined,
        )
      // The re-encode below reads only these fields, so anything else would go unchecked.
      checkKeys(
        a.extraData,
        ['serializerVersion', 'stateMachines', 'unparsed'],
        'oracle state machine data',
        path,
      )
      for (const machine of a.extraData.stateMachines ?? []) {
        checkKeys(machine, MACHINE_KEYS, 'oracle state machine', path)
      }
      const encoded = encodeStateMachineController(a.extraData)
      if (bytesEqual(new Uint8Array(encoded), rawB))
        record('known', KNOWN_SMC, path, `${rawB.length} bytes`)
      else
        real(
          'StateMachineController re-encode differs from our raw bytes',
          path,
          `${encoded.length} bytes`,
          `${rawB.length} bytes`,
        )
      return
    }

    if (a.extraData !== undefined) {
      if (b.extraData === undefined) {
        return real(
          'oracle decoded extraData, we kept raw bytes',
          path,
          show(a.extraData),
          `${rawB.length} bytes`,
        )
      }
      let theirData = a.extraData
      if (a.name === 'Klei.AI.Modifiers' && 'diseases' in theirData) {
        record('known', KNOWN_MODIFIERS, path, 'renamed')
        // Rebuilt by hand below, so no other key may be dropped silently.
        checkKeys(theirData, ['amounts', 'diseases'], 'oracle Modifiers data', path)
        theirData = { amounts: theirData.amounts, sicknesses: theirData.diseases }
      }
      if (a.name === 'Storage') cmpStored(theirData, b.extraData, `${path}.extraData`)
      else cmp(theirData, b.extraData, `${path}.extraData`)
    } else if (b.extraData !== undefined) {
      real('we decoded extraData, oracle did not', path, undefined, b.extraData)
    }
    if (!bytesEqual(rawA, rawB))
      real('extraRaw differs', path, `${rawA.length} bytes`, `${rawB.length} bytes`)
  }

  function cmpGameObject(a: Loose, b: Loose, path: string, extraKeys: string[] = []): void {
    // Items inside a Storage also carry their prefab name.
    checkKeys(a, [...GAME_OBJECT_KEYS, ...extraKeys], 'oracle game object', path)
    checkKeys(b, [...GAME_OBJECT_KEYS, ...extraKeys], 'our game object', path)
    cmp(a.position, b.position, `${path}.position`)
    cmp(a.rotation, b.rotation, `${path}.rotation`)
    cmp(a.scale, b.scale, `${path}.scale`)
    cmp(a.folder, b.folder, `${path}.folder`)
    if (a.behaviors.length !== b.behaviors.length) {
      return real('behavior count differs', path, a.behaviors.length, b.behaviors.length)
    }
    a.behaviors.forEach((behavior: Loose, i: number) => {
      cmpBehavior(behavior, b.behaviors[i], `${path}.behaviors[${i}]<${behavior.name}>`)
    })
  }

  function cmpStored(a: Loose[], b: Loose[], path: string): void {
    if (a.length !== b.length) return real('storage item count differs', path, a.length, b.length)
    a.forEach((item, i) => {
      cmp(item.name, b[i].name, `${path}[${i}].name`)
      cmpGameObject(item, b[i], `${path}[${i}]`, ['name'])
    })
  }

  checkKeys(theirs, SAVE_PARTS as readonly string[], 'oracle save', 'save')
  // `warnings` only exists on our side; the oracle has no equivalent, so ours must be empty.
  checkKeys(ours, [...SAVE_PARTS, 'warnings'], 'our save', 'save')
  for (const warning of ours.warnings ?? [])
    real('our parser warned', 'warnings', undefined, warning)
  for (const part of SAVE_PARTS) {
    if (part !== 'gameObjects') cmp(theirs[part], ours[part], part)
  }
  if (theirs.gameObjects.length !== ours.gameObjects.length) {
    real('group count differs', 'gameObjects', theirs.gameObjects.length, ours.gameObjects.length)
  } else {
    theirs.gameObjects.forEach((group: Loose, g: number) => {
      const other = ours.gameObjects[g]
      checkKeys(group, GROUP_KEYS, 'oracle group', `gameObjects[${g}]`)
      checkKeys(other, GROUP_KEYS, 'our group', `gameObjects[${g}]`)
      if (group.name !== other.name)
        return real('group name differs', `gameObjects[${g}]`, group.name, other.name)
      if (group.gameObjects.length !== other.gameObjects.length) {
        return real(
          'group size differs',
          `gameObjects<${group.name}>`,
          group.gameObjects.length,
          other.gameObjects.length,
        )
      }
      group.gameObjects.forEach((go: Loose, i: number) => {
        cmpGameObject(go, other.gameObjects[i], `gameObjects<${group.name}>[${i}]`)
      })
    })
  }

  const order: Record<Kind, number> = { real: 0, known: 1, representation: 2 }
  const entries = [...stats.values()].sort(
    (x, y) =>
      order[x.kind] - order[y.kind] ||
      x.category.localeCompare(y.category) ||
      x.pattern.localeCompare(y.pattern),
  )
  return { comparedValues, entries }
}
