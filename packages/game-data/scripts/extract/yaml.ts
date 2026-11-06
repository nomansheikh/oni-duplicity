import { existsSync, readdirSync } from 'node:fs'

/** The worldgen YAMLs are simple enough to read line by line; these are the shapes they use. */

/** Top-level `key: value` scalars; nested blocks are not read. */
export function topLevel(text: string): Map<string, string> {
  const values = new Map<string, string>()
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Za-z]+):\s*(.*?)\s*(?:#.*)?$/.exec(line)
    if (match && match[2]) values.set(match[1]!, match[2])
  }
  return values
}

/** An inline list value: `[A, B]` or `A`. */
export const inlineList = (value?: string): string[] =>
  value
    ? value
        .replace(/[[\]]/g, '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []

/** A top-level list, written inline (`key: [A, B]`) or as a block of `- item` lines. */
export function listField(text: string, key: string): string[] {
  const inline = topLevel(text).get(key)
  if (inline) return inlineList(inline)
  const items: string[] = []
  let inside = false
  for (const line of text.split(/\r?\n/)) {
    if (new RegExp(`^${key}:`).test(line)) inside = true
    else if (/^[A-Za-z]/.test(line)) inside = false
    const match = inside ? /^\s*-\s*([^\s#]+)/.exec(line) : null
    if (match) items.push(match[1]!)
  }
  return items
}

/** How many `- name:` entries a top-level block list has, e.g. `subworldMixingRules`. */
export function countEntries(text: string, key: string): number {
  let inside = false
  let count = 0
  for (const line of text.split(/\r?\n/)) {
    if (new RegExp(`^${key}:`).test(line)) inside = true
    else if (/^[A-Za-z]/.test(line)) inside = false
    else if (inside && /^\s*-\s*name:/.test(line)) count++
  }
  return count
}

export const yamlFiles = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((file) => file.endsWith('.yaml'))
        .sort()
    : []
