// Value-level comparison of oni-save-parser (the oracle) against our parser.
//
// Only values are compared, never bytes or length prefixes: the two parsers write collection
// lengths differently, so neither re-reads the other's output. Representation differences
// (int64 shape, colours, buffers) are normalised; known structural differences are counted
// but not failures; anything else is a real disagreement.

import { createRecorder, show } from './compare/recorder.ts'
import { encodeStateMachineController } from './compare/state-machine.ts'
import type { Loose, Report } from './compare/types.ts'
import { bytesEqual, cmp as compare, toBytes } from './compare/values.ts'

export { encodeStateMachineController }
export type { Entry, Kind, Report } from './compare/types.ts'

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

/** `theirs` is the oracle's save, `ours` is `parseSave`'s. */
export function compareSaves(theirs: Loose, ours: Loose): Report {
  const rec = createRecorder()
  const record = rec.record.bind(rec)
  const real = rec.real.bind(rec)
  const checkKeys = rec.checkKeys.bind(rec)
  const cmp = (x: Loose, y: Loose, path: string) => compare(rec, x, y, path)

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

  return { comparedValues: rec.compared, entries: rec.entries() }
}
