// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, expect, test } from 'vite-plus/test'
import { Slider } from './slider'

// happy-dom has no layout or pointer capture; give the slider a 100px track so pointer x = value.
beforeEach(() => {
  Element.prototype.getBoundingClientRect = () =>
    ({ x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 20, width: 100, height: 20 }) as DOMRect
  const captured = new WeakSet<Element>()
  Element.prototype.setPointerCapture = function (this: Element) {
    captured.add(this)
  }
  Element.prototype.hasPointerCapture = function (this: Element) {
    return captured.has(this)
  }
  Element.prototype.releasePointerCapture = function (this: Element) {
    captured.delete(this)
  }
})
afterEach(cleanup)

// An amount card in miniature: the slider commits on release, and the buttons stand in for
// other ways the value changes (the number field, "fill needs", undo).
function Harness() {
  const [value, setValue] = useState(0)
  return (
    <>
      <Slider value={[value]} max={100} onValueCommit={([v]) => setValue(v!)} />
      <button onClick={() => setValue(100)}>fill</button>
      <button onClick={() => setValue(70)}>set 70</button>
    </>
  )
}

const thumbValue = () => screen.getByRole('slider').getAttribute('aria-valuenow')

test('a drag that ends where it started does not pin the thumb', () => {
  render(<Harness />)
  const root = screen.getByRole('slider').closest('[data-slot="slider"]')!
  fireEvent.pointerDown(root, { pointerId: 1, clientX: 0, button: 0 })
  fireEvent.pointerMove(root, { pointerId: 1, clientX: 60 })
  expect(thumbValue()).toBe('60')
  fireEvent.pointerMove(root, { pointerId: 1, clientX: 0 })
  fireEvent.pointerUp(root, { pointerId: 1, clientX: 0 })
  expect(thumbValue()).toBe('0')

  // Something else sets the amount, like "fill needs" or typing in the number field.
  fireEvent.click(screen.getByText('fill'))
  expect(thumbValue()).toBe('100')
})

test('a committed drag shows the new value', () => {
  render(<Harness />)
  const root = screen.getByRole('slider').closest('[data-slot="slider"]')!
  fireEvent.pointerDown(root, { pointerId: 1, clientX: 30, button: 0 })
  fireEvent.pointerUp(root, { pointerId: 1, clientX: 30 })
  expect(thumbValue()).toBe('30')
  fireEvent.click(screen.getByText('set 70'))
  expect(thumbValue()).toBe('70')
})
