import type { Template } from '../types.ts'

export type TemplateMap = Map<string, Template>

export interface Colour {
  r: number
  g: number
  b: number
  a: number
}
