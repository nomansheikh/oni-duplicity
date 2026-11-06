import type { ClassInfo } from './source.ts'
import type { Interp } from './interp.ts'

/** A chain the interpreter could not resolve; its text is kept so callers can recognise it. */
export class Ref {
  readonly path: string
  constructor(path: string) {
    this.path = path
  }
  toString() {
    return this.path
  }
}

export class ClassRef {
  readonly classes: ClassInfo[]
  constructor(classes: ClassInfo[]) {
    this.classes = classes
  }
}

export class NsRef {
  readonly name: string
  constructor(name: string) {
    this.name = name
  }
}

export interface Obj {
  $type: string
  $class?: ClassInfo
  [key: string]: unknown
}

export type Value =
  | number
  | string
  | boolean
  | null
  | undefined
  | Ref
  | ClassRef
  | NsRef
  | Obj
  | Value[]
  | ((args: Value[]) => Value)

export class Env {
  readonly vars = new Map<string, Value>()
  readonly parent?: Env
  readonly cls?: ClassInfo
  readonly self?: Obj
  constructor(parent?: Env, cls?: ClassInfo, self?: Obj) {
    if (parent) this.parent = parent
    if (cls) this.cls = cls
    if (self) this.self = self
  }
  lookup(name: string): { found: boolean; value?: Value } {
    if (this.vars.has(name)) return { found: true, value: this.vars.get(name) }
    return this.parent ? this.parent.lookup(name) : { found: false }
  }
  assign(name: string, value: Value): boolean {
    if (this.vars.has(name)) {
      this.vars.set(name, value)
      return true
    }
    return this.parent ? this.parent.assign(name, value) : false
  }
  get currentClass(): ClassInfo | undefined {
    return this.cls ?? this.parent?.currentClass
  }
  get currentSelf(): Obj | undefined {
    return this.self ?? this.parent?.currentSelf
  }
}

export interface DlcScope {
  required: string[]
  forbidden: string[]
}

export type Native = (
  args: Value[],
  ctx: { interp: Interp; env: Env; recv?: Value; generic?: string },
) => Value

export type Flow = { returned: boolean; value?: Value }
