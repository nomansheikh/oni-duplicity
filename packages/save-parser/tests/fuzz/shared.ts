// Shared by the fuzz test (main thread) and the fuzz worker. The worker runs under plain Node type
// stripping, so these files must only use erasable TypeScript and explicit `.ts` relative imports.
export { applyCase, describeCase, generateCase, rng, targetOf } from './shared/cases.ts'
export { readLayout, type Layout } from './shared/layout.ts'
export {
  BASE_COUNTS,
  CATEGORIES,
  type CaseResult,
  type Category,
  type Edit,
  type FuzzCase,
  type Outcome,
} from './shared/types.ts'
