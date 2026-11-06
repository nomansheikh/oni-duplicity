export class ParseError extends Error {
  readonly offset: number
  readonly context: string

  constructor(message: string, offset: number, context = '') {
    super(`${message} (at byte ${offset}${context ? `, in ${context}` : ''})`)
    this.name = 'ParseError'
    this.offset = offset
    this.context = context
  }
}
