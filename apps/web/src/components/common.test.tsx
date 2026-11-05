// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vite-plus/test'
import { CommitInput } from './common.tsx'

afterEach(cleanup)

const field = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Name' })

function setup(value: string) {
  const onCommit = vi.fn()
  const view = render(<CommitInput aria-label="Name" value={value} onCommit={onCommit} />)
  const update = (next: string) =>
    view.rerender(<CommitInput aria-label="Name" value={next} onCommit={onCommit} />)
  return { onCommit, update, user: userEvent.setup() }
}

test('typing while the model value changes keeps the draft, and blur commits it', async () => {
  const { onCommit, update, user } = setup('Arboroni')
  await user.clear(field())
  await user.type(field(), 'Second')

  // The answer to an earlier edit arrives while the field is still being typed into.
  update('First')
  expect(field().value).toBe('Second')
  expect(onCommit).not.toHaveBeenCalled()

  await user.tab()
  expect(onCommit).toHaveBeenCalledExactlyOnceWith('Second')
})

test('Enter commits the draft', async () => {
  const { onCommit, user } = setup('Arboroni')
  await user.clear(field())
  await user.type(field(), 'Prime{Enter}')
  expect(onCommit).toHaveBeenCalledExactlyOnceWith('Prime')
})

test('a model change with no draft shows the new value', () => {
  const { update } = setup('Arboroni')
  update('Undone')
  expect(field().value).toBe('Undone')
})

test('after blur, the field follows the model again', async () => {
  const { update, user } = setup('Arboroni')
  await user.clear(field())
  await user.type(field(), 'Typed')
  await user.tab()
  update('Normalised')
  expect(field().value).toBe('Normalised')
})

test('blurring without a change commits nothing', async () => {
  const { onCommit, user } = setup('Arboroni')
  await user.click(field())
  await user.tab()
  expect(onCommit).not.toHaveBeenCalled()
})
