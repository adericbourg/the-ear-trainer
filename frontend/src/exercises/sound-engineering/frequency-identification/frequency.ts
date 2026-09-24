import type { Level } from '../../pitch/intervals/interval'

export const F_MIN = 100
export const F_MAX = 15000
// Selector width in octaves, around its geometric center.
const OCTAVES: Record<Level, number> = { beginner: 1, intermediate: 1 / 2, advanced: 1 / 3, expert: 1 / 4 }
export const halfSpanOf = (level: Level) => 2 ** (OCTAVES[level] / 2)
export const centerMinOf = (level: Level) => F_MIN * halfSpanOf(level)
export const centerMaxOf = (level: Level) => F_MAX / halfSpanOf(level)
export const INITIAL_CENTER = Math.sqrt(F_MIN * F_MAX)
export const ARROW_STEP = 2 ** (1 / 24)
export const PAGE_STEP = 2

// 10 Hz steps below 1 kHz, 100 Hz up to 10 kHz, 1 kHz above: precision relative to the frequency.
const roundTo2Digits = (frequency: number) => Number(frequency.toPrecision(2))

export const toPosition = (frequency: number) => Math.log(frequency / F_MIN) / Math.log(F_MAX / F_MIN)
export const toFrequency = (position: number) => F_MIN * (F_MAX / F_MIN) ** position

// Log-uniform: a uniform draw in Hz would put most targets above 2 kHz.
export const randomTarget = () => roundTo2Digits(toFrequency(Math.random()))

export const clampCenter = (level: Level, center: number) => Math.min(Math.max(center, centerMinOf(level)), centerMaxOf(level))

export const bounds = (level: Level, center: number) => ({
  low: roundTo2Digits(center / halfSpanOf(level)),
  high: roundTo2Digits(center * halfSpanOf(level)),
})

// Steps by `factor` until a displayed bound changes: a single step can be smaller than the rounding.
export function nudge(level: Level, center: number, factor: number) {
  const { low, high } = bounds(level, center)
  let next = center
  do {
    const previous = next
    next = clampCenter(level, next * factor)
    if (next === previous) break
  } while (bounds(level, next).low === low && bounds(level, next).high === high)
  return next
}

export function isHit(level: Level, target: number, center: number) {
  const { low, high } = bounds(level, center)
  return low <= target && target <= high
}
