/** Whether a selected fixture that is not on disk must fail the run instead of being skipped. */
export function missingIsFatal(
  fixture: { committed: boolean },
  env: Record<string, string | undefined>,
): boolean {
  // Committed fixtures are always in a checkout; under CI every selected fixture has been fetched.
  return fixture.committed || Boolean(env.CI)
}
