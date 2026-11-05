const KEY = 'duplicity:skill-plans'

/** Plans by duplicant id. Kept in this browser only; nothing is written to the save. */
export type Plans = Record<string, string[]>

export function readPlans(storage: Pick<Storage, 'getItem'> = localStorage): Plans {
  try {
    const raw = JSON.parse(storage.getItem(KEY) ?? '{}') as unknown
    if (typeof raw !== 'object' || raw === null) return {}
    return Object.fromEntries(
      Object.entries(raw).filter(
        (e): e is [string, string[]] =>
          Array.isArray(e[1]) && e[1].every((v) => typeof v === 'string'),
      ),
    )
  } catch {
    return {}
  }
}

export function writePlan(
  dupeId: string,
  plan: string[],
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): void {
  try {
    const plans = readPlans(storage)
    if (plan.length === 0) delete plans[dupeId]
    else plans[dupeId] = plan
    storage.setItem(KEY, JSON.stringify(plans))
  } catch {
    // Storage can be unavailable (private mode); the plan then lasts for this visit.
  }
}
