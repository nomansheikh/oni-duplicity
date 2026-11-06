export interface Param {
  name: string
  type: string
  /** Source text of the default value, when the parameter has one. */
  def?: string
}

export interface MethodInfo {
  name: string
  params: Param[]
  /** Text between the braces, or the expression of an `=>` body wrapped as a return. */
  body: string
  owner: ClassInfo
  isStatic: boolean
}

export interface FieldInfo {
  name: string
  expr: string
  owner: ClassInfo
}

export interface ClassInfo {
  name: string
  namespace: string
  parent?: ClassInfo
  base?: string
  fields: Map<string, FieldInfo>
  methods: Map<string, MethodInfo[]>
  nested: Map<string, ClassInfo>
  enumMembers?: string[]
}
