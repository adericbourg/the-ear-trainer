export const F_MIN = 100
export const F_MAX = 15000
// The selector spans half an octave (ratio √2) around its geometric center.
export const HALF_SPAN = 2 ** (1 / 4)
export const CENTER_MIN = F_MIN * HALF_SPAN
export const CENTER_MAX = F_MAX / HALF_SPAN
export const INITIAL_CENTER = Math.sqrt(F_MIN * F_MAX)
export const ARROW_STEP = 2 ** (1 / 24)
export const PAGE_STEP = 2

const roundTo10 = (frequency: number) => Math.round(frequency / 10) * 10

export const toPosition = (frequency: number) => Math.log(frequency / F_MIN) / Math.log(F_MAX / F_MIN)
export const toFrequency = (position: number) => F_MIN * (F_MAX / F_MIN) ** position

// Log-uniform: a uniform draw in Hz would put most targets above 2 kHz.
export const randomTarget = () => roundTo10(toFrequency(Math.random()))

export const clampCenter = (center: number) => Math.min(Math.max(center, CENTER_MIN), CENTER_MAX)

export const bounds = (center: number) => ({ low: roundTo10(center / HALF_SPAN), high: roundTo10(center * HALF_SPAN) })

export function isHit(target: number, center: number) {
  const { low, high } = bounds(center)
  return low <= target && target <= high
}
