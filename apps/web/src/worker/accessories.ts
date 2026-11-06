import type { GameObject } from '@oni-duplicity/save-parser'
import type { AccessorySlot, AccessorySlotView } from './duplicant-types.ts'
import { behavior } from './save-helpers.ts'

export const ACCESSORY_PREFIX = 'Root.Accessories.'

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}

const pad = (n: number) => String(n).padStart(3, '0')

/** Accessory numbers seen in real saves (7.33–7.38); offering others could reference art that doesn't exist. */
const KNOWN_ACCESSORIES: Record<AccessorySlot, number[]> = {
  hair: [...range(1, 33), 36, 37, 38, 43, 44, 45, 52],
  headshape: range(1, 5),
  eyes: range(1, 6),
  mouth: [...range(1, 5), 8],
  torso: range(1, 4),
  skin: range(1, 5),
}

const SLOT_LABELS: Record<AccessorySlot, string> = {
  hair: 'Hair',
  headshape: 'Head shape',
  eyes: 'Eyes',
  mouth: 'Mouth',
  torso: 'Shirt',
  skin: 'Skin tone',
}

/** Accessory types that follow each slot's number (e.g. the hat version of a hairstyle). */
export const SLOT_TYPES: Record<AccessorySlot, string[]> = {
  hair: ['hair', 'hat_hair'],
  headshape: ['headshape'],
  eyes: ['eyes'],
  mouth: ['mouth'],
  torso: ['torso', 'arm_sleeve', 'arm_lower_sleeve'],
  skin: ['arm_lower', 'arm_upper', 'leg_skin'],
}

function accessoryNumbers(obj: GameObject): Map<string, string> {
  const list = (behavior(obj, 'Accessorizer')?.templateData?.accessories ?? []) as {
    guid: { Guid: string }
  }[]
  const numbers = new Map<string, string>()
  for (const entry of list) {
    const match = /^(.+)_(\d{3})$/.exec(entry.guid.Guid.replace(ACCESSORY_PREFIX, ''))
    if (match) numbers.set(match[1]!, match[2]!)
  }
  return numbers
}

export function appearanceOf(obj: GameObject): AccessorySlotView[] {
  const numbers = accessoryNumbers(obj)
  const slots: AccessorySlotView[] = []
  for (const slot of Object.keys(SLOT_TYPES) as AccessorySlot[]) {
    const current = numbers.get(SLOT_TYPES[slot][0]!)
    if (!current) continue
    const options = new Set(KNOWN_ACCESSORIES[slot].map(pad))
    options.add(current)
    slots.push({ slot, label: SLOT_LABELS[slot], current, options: [...options].sort() })
  }
  return slots
}
