import { describe, expect, it } from 'vite-plus/test'
import { GROUPS, SAVELESS_PAGES, toolPages } from './nav'

describe('toolPages', () => {
  const tools = GROUPS.find((g) => g.id === 'tools')!.pages

  it('lists every Tools page in tab order', () => {
    expect(toolPages().map((p) => p.id)).toEqual(tools.map((p) => p.id))
  })

  it('marks the pages that open without a save', () => {
    for (const page of toolPages()) expect(page.saveless).toBe(SAVELESS_PAGES.has(page.id))
    expect(toolPages().find((p) => p.id === 'seed-finder')?.saveless).toBe(true)
  })

  it('gives each tool an icon and a purpose line', () => {
    for (const page of toolPages()) {
      expect(page.icon, page.id).toBeDefined()
      expect(page.purpose, page.id).toMatch(/\.$/)
    }
  })
})
