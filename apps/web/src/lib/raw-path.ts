import type { RawPath } from '@/worker/model'

/** `gameObjects[3].gameObjects[0].behaviors[2]` */
export function formatPath(path: RawPath): string {
  return path
    .map((part, i) => (typeof part === 'number' ? `[${part}]` : i === 0 ? part : `.${part}`))
    .join('')
}

/** Accepts `a.b[0].c` and `a.b.0.c`. */
export function parsePath(text: string): RawPath {
  return text
    .replaceAll(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .map((part) => (/^\d+$/.test(part) ? Number(part) : part))
}
