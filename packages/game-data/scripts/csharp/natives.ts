import type { Value } from './values.ts'

export function stringMethod(s: string, name: string, args: Value[]): Value {
  switch (name) {
    case 'ToTag':
    case 'CreateTag':
    case 'ToString':
    case 'Trim':
      return s
    case 'ToUpper':
      return s.toUpperCase()
    case 'ToLower':
      return s.toLowerCase()
    case 'Contains':
      return typeof args[0] === 'string' ? s.includes(args[0]) : undefined
    case 'StartsWith':
      return typeof args[0] === 'string' ? s.startsWith(args[0]) : undefined
    case 'Equals':
      return typeof args[0] === 'string' ? s === args[0] : undefined
  }
  return undefined
}

export function listMethod(list: Value[], name: string, args: Value[]): Value {
  switch (name) {
    case 'Add':
      list.push(args[0])
      return undefined
    case 'AddRange':
      if (Array.isArray(args[0])) list.push(...args[0])
      return undefined
    case 'ToArray':
    case 'ToList':
      return [...list]
    case 'Contains':
      return list.includes(args[0])
    case 'Concat':
      return Array.isArray(args[0]) ? [...list, ...args[0]] : [...list]
    case 'Find':
    case 'FirstOrDefault':
      return typeof args[0] === 'function'
        ? (list.find((x) => args[0] instanceof Function && args[0]([x]) === true) ?? null)
        : undefined
    case 'FindAll':
    case 'Where':
      return typeof args[0] === 'function'
        ? list.filter((x) => args[0] instanceof Function && args[0]([x]) === true)
        : undefined
    case 'Any':
      return typeof args[0] === 'function'
        ? list.some((x) => args[0] instanceof Function && args[0]([x]) === true)
        : list.length > 0
  }
  return undefined
}
