import { expect, test } from 'vite-plus/test'
import { clampProgress, filledCells, meterTone } from '../src/lib/meter.ts'

test('clampProgress limits to 0..max and treats null as 0', () => {
  expect(clampProgress(-5)).toBe(0)
  expect(clampProgress(42)).toBe(42)
  expect(clampProgress(250)).toBe(100)
  expect(clampProgress(30, 20)).toBe(20)
  expect(clampProgress(null)).toBe(0)
  expect(clampProgress(undefined)).toBe(0)
  expect(clampProgress(Number.NaN)).toBe(0)
})

test('meterTone amount thresholds', () => {
  expect(meterTone('amount', 50)).toBe('good')
  expect(meterTone('amount', 49.9)).toBe('warn')
  expect(meterTone('amount', 25)).toBe('warn')
  expect(meterTone('amount', 24.9)).toBe('bad')
})

test('meterTone health thresholds', () => {
  expect(meterTone('health', 70)).toBe('good')
  expect(meterTone('health', 69)).toBe('warn')
  expect(meterTone('health', 35)).toBe('warn')
  expect(meterTone('health', 34)).toBe('bad')
})

test('meterTone stress is inverted', () => {
  expect(meterTone('stress', 40)).toBe('good')
  expect(meterTone('stress', 41)).toBe('warn')
  expect(meterTone('stress', 70)).toBe('warn')
  expect(meterTone('stress', 71)).toBe('bad')
})

test('filledCells shows at least one cell for any value above 0', () => {
  expect(filledCells(0, 20)).toBe(0)
  expect(filledCells(0.1, 20)).toBe(1)
  expect(filledCells(2, 20)).toBe(1)
  expect(filledCells(50, 20)).toBe(10)
  expect(filledCells(100, 20)).toBe(20)
  expect(filledCells(150, 20)).toBe(20)
})
