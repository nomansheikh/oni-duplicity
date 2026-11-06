import { expect, test } from '@playwright/test'
import {
  behavior,
  downloadSave,
  expectOnlyChanged,
  goTo,
  group,
  hasFixture,
  openSave,
  original,
} from './helpers.ts'
import {
  fixtureDupe,
  indexOf,
  MITHRO,
  path,
  pick,
  setNumber,
  type Amount,
} from './duplicants-helpers.ts'

test.describe('bionic duplicants', () => {
  // The 40 MB save is only fetched by the full tier (main and nightly). There, a missing
  // fixture is a failure; everywhere else the test is skipped.
  const required = Boolean(process.env.CI) && process.env.FIXTURE_TIER === 'all'
  test.skip(!required && !hasFixture(MITHRO), `${MITHRO} is not downloaded`)

  test('sets power bank charge and gear oil', async ({ page }) => {
    expect(hasFixture(MITHRO), `${MITHRO} is missing from the full-tier fixtures`).toBe(true)
    await openSave(page, MITHRO)
    await goTo(page, 'Duplicants')
    await pick(page, 'Sonyar')
    await page.getByRole('tab', { name: 'Health & systems' }).click()
    // Power is shown in kJ and stored in joules.
    await setNumber(page, 'Power Banks', 300)
    await setNumber(page, 'Gear Oil', 120)

    const { save } = await downloadSave(page)
    const before = fixtureDupe(MITHRO, 'BionicMinion', 0).amounts
    const power = indexOf(before, (a) => a.name === 'BionicInternalBattery')
    const oil = indexOf(before, (a) => a.name === 'BionicOil')
    const amounts = (
      behavior(group(save, 'BionicMinion')[0]!, 'MinionModifiers')!.extraData as {
        amounts: Amount[]
      }
    ).amounts
    expect(amounts[power]!.value.value).toBeCloseTo(300_000, 0)
    expect(amounts[oil]!.value.value).toBeCloseTo(120, 4)
    expectOnlyChanged(original(MITHRO), save, [
      new RegExp(
        path('BionicMinion', 0, 'MinionModifiers', `extraData/amounts/${power}/value/value`),
      ),
      new RegExp(
        path('BionicMinion', 0, 'MinionModifiers', `extraData/amounts/${oil}/value/value`),
      ),
    ])
  })

  test('keeps bionic amounts within the game maximums', async ({ page }) => {
    expect(hasFixture(MITHRO), `${MITHRO} is missing from the full-tier fixtures`).toBe(true)
    await openSave(page, MITHRO)
    await goTo(page, 'Duplicants')
    await pick(page, 'Sonyar')
    await page.getByRole('tab', { name: 'Health & systems' }).click()
    // Typed far past the maximum; Sonyar has the BionicsC3 skill, so the battery holds 720 kJ.
    await setNumber(page, 'Power Banks', 5000)
    await setNumber(page, 'Gear Oil', 5000)
    await setNumber(page, 'Gunk', 5000)
    await setNumber(page, 'Oxygen Tank', 5000)
    await expect(page.getByRole('spinbutton', { name: 'Power Banks', exact: true })).toHaveValue(
      '720',
    )
    await expect(page.getByRole('spinbutton', { name: 'Gunk', exact: true })).toHaveValue('80')

    const { save } = await downloadSave(page)
    const before = fixtureDupe(MITHRO, 'BionicMinion', 0).amounts
    const idx = (name: string) => indexOf(before, (a) => a.name === name)
    const amounts = (
      behavior(group(save, 'BionicMinion')[0]!, 'MinionModifiers')!.extraData as {
        amounts: Amount[]
      }
    ).amounts
    expect(amounts[idx('BionicInternalBattery')]!.value.value).toBeCloseTo(720_000, 0)
    expect(amounts[idx('BionicOil')]!.value.value).toBeCloseTo(200, 4)
    expect(amounts[idx('BionicGunk')]!.value.value).toBeCloseTo(80, 4)
    expect(amounts[idx('BionicOxygenTank')]!.value.value).toBeCloseTo(240, 3)
    expectOnlyChanged(
      original(MITHRO),
      save,
      ['BionicInternalBattery', 'BionicOil', 'BionicGunk', 'BionicOxygenTank'].map(
        (name) =>
          new RegExp(
            path(
              'BionicMinion',
              0,
              'MinionModifiers',
              `extraData/amounts/${idx(name)}/value/value`,
            ),
          ),
      ),
    )
  })
})
