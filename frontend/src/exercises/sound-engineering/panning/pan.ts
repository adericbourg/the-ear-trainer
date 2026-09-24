import type { Level } from '../../pitch/intervals/interval'

// -100 = hard left, 0 = center, 100 = hard right.
export const PAN_MIN = -100
export const PAN_MAX = 100
// Even selector widths keep the bounds integers.
const HALF_WIDTH: Record<Level, number> = { beginner: 25, intermediate: 15, advanced: 10, expert: 6 }
export const halfWidthOf = (level: Level) => HALF_WIDTH[level]
export const centerMinOf = (level: Level) => PAN_MIN + halfWidthOf(level)
export const centerMaxOf = (level: Level) => PAN_MAX - halfWidthOf(level)
export const INITIAL_CENTER = 0
export const ARROW_STEP = 1
export const PAGE_STEP = 10

export const formatPan = (pan: number) => (pan === 0 ? 'C' : pan < 0 ? `L${-pan}` : `R${pan}`)

export const toPosition = (pan: number) => (pan - PAN_MIN) / (PAN_MAX - PAN_MIN)
export const toPan = (position: number) => Math.round(position * (PAN_MAX - PAN_MIN) + PAN_MIN)

export const randomTarget = () => PAN_MIN + Math.floor(Math.random() * (PAN_MAX - PAN_MIN + 1))

export const clampCenter = (level: Level, center: number) => Math.min(Math.max(center, centerMinOf(level)), centerMaxOf(level))

export const bounds = (level: Level, center: number) => ({ low: center - halfWidthOf(level), high: center + halfWidthOf(level) })

export function isHit(level: Level, target: number, center: number) {
  const { low, high } = bounds(level, center)
  return low <= target && target <= high
}
