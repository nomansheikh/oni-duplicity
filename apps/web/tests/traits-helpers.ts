import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const testData = fileURLToPath(new URL('../../../test-data/', import.meta.url))
const manifest = JSON.parse(readFileSync(`${testData}fixtures.json`, 'utf8')) as {
  fixtures: { file: string; committed: boolean }[]
}
export const pathOf = (file: string) => {
  const entry = manifest.fixtures.find((f) => f.file === file)!
  return `${testData}${entry.committed ? 'saves' : 'fetched'}/${file}`
}
export const fixtures = manifest.fixtures.map((f) => pathOf(f.file)).filter((p) => existsSync(p))
export const galaxy = pathOf('beautiful-galaxy.sav')
export const bionicSave = pathOf('mithro-06-maximum-cycle-4770.sav')
