/**
 * A small index over decompiled C# (https://github.com/Kupie/ONI_Decomp): classes, their static
 * fields, and their methods with parameter lists and bodies. It reads just enough C# for the
 * ranching extractor and understands nothing else.
 */
import { readFileSync } from 'node:fs'
import { findSemi, matchClose, splitTop, stripComments, walk } from './scan.ts'
import type { ClassInfo, MethodInfo, Param } from './types.ts'

export { matchClose, splitTop, stripComments } from './scan.ts'
export type { ClassInfo, FieldInfo, MethodInfo, Param } from './types.ts'

function parseParams(text: string): Param[] {
  if (text.trim() === '') return []
  return splitTop(text).map((raw) => {
    const eq = raw.indexOf('=')
    const decl = (eq < 0 ? raw : raw.slice(0, eq)).replace(/\b(params|ref|out|this)\b/g, '').trim()
    const name = decl.split(/\s+/).at(-1)!
    const type = decl.slice(0, decl.length - name.length).trim()
    return { name, type, ...(eq < 0 ? {} : { def: raw.slice(eq + 1).trim() }) }
  })
}

export class SourceIndex {
  /** Simple class name to every class with it (e.g. CREATURES in both TUNING and STRINGS). */
  readonly byName = new Map<string, ClassInfo[]>()
  readonly namespaces = new Set<string>()

  constructor(root: string) {
    for (const file of walk(root)) this.addFile(readFileSync(file, 'utf8'))
  }

  private addFile(raw: string) {
    const src = stripComments(raw.replace(/^﻿/, ''))
    const ns = /^\s*namespace\s+([\w.]+)/m.exec(src)?.[1] ?? ''
    if (ns) this.namespaces.add(ns)
    const body = ns ? src.slice(src.indexOf('{', src.search(/^\s*namespace\s/m)) + 1) : src
    this.parseMembers(body, undefined, ns)
  }

  private register(info: ClassInfo) {
    const list = this.byName.get(info.name) ?? []
    list.push(info)
    this.byName.set(info.name, list)
  }

  /** Walks the members of a namespace or class body, creating ClassInfos for type declarations. */
  private parseMembers(body: string, owner: ClassInfo | undefined, ns: string) {
    let i = 0
    while (i < body.length) {
      // Find the next member boundary at depth 0.
      let j = i
      let firstEq = -1
      let firstParen = -1
      let end = -1
      let kind: 'semi' | 'block' | 'none' = 'none'
      while (j < body.length) {
        const c = body[j]!
        if (c === '"' || c === "'") {
          const verbatim = c === '"' && body[j - 1] === '@'
          j += 1
          while (j < body.length) {
            if (!verbatim && body[j] === '\\') j += 2
            else if (body[j] === c) {
              if (verbatim && body[j + 1] === '"') j += 2
              else break
            } else j += 1
          }
          j += 1
          continue
        }
        if (c === '[' && firstEq < 0 && firstParen < 0 && /^\s*$/.test(body.slice(i, j))) {
          // Attribute such as [EntityConfigOrder(1)].
          j = matchClose(body, j) + 1
          i = j
          continue
        }
        if (
          c === '=' &&
          body[j + 1] !== '=' &&
          body[j + 1] !== '>' &&
          firstEq < 0 &&
          firstParen < 0
        )
          firstEq = j
        if (c === '=' && body[j + 1] === '>' && firstEq < 0) {
          // Expression-bodied member: runs to the next ';' at depth 0.
          const semi = findSemi(body, j)
          end = semi
          kind = 'semi'
          firstEq = -2
          break
        }
        if (c === '(') {
          if (firstParen < 0) firstParen = j
          j = matchClose(body, j) + 1
          continue
        }
        if (c === '[') {
          j = matchClose(body, j) + 1
          continue
        }
        if (c === '{') {
          if (firstEq >= 0) {
            j = matchClose(body, j) + 1
            continue
          }
          end = j
          kind = 'block'
          break
        }
        if (c === ';') {
          end = j
          kind = 'semi'
          break
        }
        j += 1
      }
      if (kind === 'none') break
      const head = body.slice(i, end).trim()
      if (kind === 'semi') {
        if (owner && firstEq >= 0) {
          const decl = body.slice(i, firstEq).trim()
          const name = decl.split(/\s+/).at(-1)!
          if (/^\w+$/.test(name) && !decl.includes('(')) {
            owner.fields.set(name, {
              name,
              expr: body.slice(firstEq + 1, end).trim(),
              owner,
            })
          }
        } else if (owner && firstEq === -2) {
          // `Type Name => expr;` property or method.
          const arrow = body.indexOf('=>', i)
          const decl = body.slice(i, arrow).trim()
          this.addMethodLike(owner, decl, `return ${body.slice(arrow + 2, end).trim()};`)
        }
        i = end + 1
        continue
      }
      // Block: type, method, property or accessor.
      const close = matchClose(body, end)
      const inner = body.slice(end + 1, close)
      const typeMatch =
        /(?:^|\s)(class|struct|interface|enum)\s+(\w+)(?:\s*:\s*([^{]*))?$/.exec(head) ?? undefined
      if (typeMatch) {
        const info: ClassInfo = {
          name: typeMatch[2]!,
          namespace: ns,
          fields: new Map(),
          methods: new Map(),
          nested: new Map(),
        }
        if (owner) info.parent = owner
        const bases = typeMatch[3]?.split(',').map((s) => s.trim())
        if (bases?.[0] && !/^I[A-Z]/.test(bases[0])) info.base = bases[0].replace(/<.*/, '')
        if (typeMatch[1] === 'enum') {
          info.enumMembers = splitTop(inner).map((m) => m.split('=')[0]!.trim())
        } else {
          this.parseMembers(inner, info, ns)
        }
        if (owner) owner.nested.set(info.name, info)
        else this.register(info)
        // Nested classes are also reachable by simple name for unqualified references.
        if (owner) this.register(info)
      } else if (owner && firstParen >= 0) {
        this.addMethodLike(owner, head, inner)
      }
      i = close + 1
    }
  }

  private addMethodLike(owner: ClassInfo, head: string, body: string) {
    const paren = head.indexOf('(')
    if (paren < 0) return
    const before = head.slice(0, paren).trim()
    const name = before.split(/\s+/).at(-1)!.replace(/<.*/, '')
    if (!/^\w+$/.test(name)) return
    const closeParen = matchClose(head, paren)
    const params = parseParams(head.slice(paren + 1, closeParen))
    const isStatic = /\bstatic\b/.test(before)
    const info: MethodInfo = { name, params, body, owner, isStatic }
    // Constructors chained with `: this(...)` / `: base(...)` keep their own body only.
    const list = owner.methods.get(name) ?? []
    list.push(info)
    owner.methods.set(name, list)
  }

  /** Classes named `name`, optionally restricted to a namespace. */
  find(name: string, ns?: string): ClassInfo[] {
    const all = this.byName.get(name) ?? []
    return ns ? all.filter((c) => c.namespace === ns) : all
  }
}
