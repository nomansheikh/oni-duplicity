import { expect, test } from '@playwright/test'
import { downloadSave, GALAXY, goTo, group, behavior, openSave, original } from './helpers.ts'

test('cloning a duplicant adds a valid copy to the downloaded save', async ({ page }) => {
  const before = original(GALAXY)
  const source = group(before, 'Minion')[0]!
  const name = String(behavior(source, 'MinionIdentity')!.templateData!.name)

  await openSave(page)
  await goTo(page, 'Duplicants')
  await page
    .locator('button')
    .filter({ has: page.getByText(name, { exact: true }) })
    .first()
    .click()
  await page.getByRole('button', { name: 'Clone', exact: true }).click()
  await expect(
    page.locator('button').filter({ has: page.getByText(`${name} (clone)`, { exact: true }) }),
  ).toHaveCount(1)

  const { save } = await downloadSave(page)
  const minions = group(save, 'Minion')
  expect(minions).toHaveLength(group(before, 'Minion').length + 1)
  const copy = minions[1]!
  const id = (o: typeof copy) => Number(behavior(o, 'KPrefabID')!.templateData!.InstanceID)
  const identity = behavior(copy, 'MinionIdentity')!.templateData!
  expect(identity.name).toBe(`${name} (clone)`)

  // A new id, a new proxy that points back at the copy, and the copy in the original's schedule.
  const ids = save.gameObjects.flatMap((g) => g.gameObjects.map(id).filter((n) => !Number.isNaN(n)))
  expect(new Set(ids).size).toBe(ids.length)
  const proxy = group(save, 'MinionAssignablesProxy').find(
    (p) => id(p) === (identity.assignableProxy as { id: number }).id,
  )!
  expect(behavior(proxy, 'MinionAssignablesProxy')!.templateData!.target_instance_id).toBe(id(copy))
  const schedules = behavior(group(save, 'SaveGame')[0]!, 'ScheduleManager')!.templateData!
    .schedules as { assigned: { id: number }[] }[]
  const theirs = schedules.find((s) => s.assigned.some((a) => a.id === id(source)))!
  expect(theirs.assigned.some((a) => a.id === id(copy))).toBe(true)
  expect(save.header.gameInfo.numberOfDuplicants).toBe(
    before.header.gameInfo.numberOfDuplicants + 1,
  )
})
