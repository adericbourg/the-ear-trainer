import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ARROW_STEP,
  bounds,
  CENTER_MAX,
  CENTER_MIN,
  clampCenter,
  F_MAX,
  F_MIN,
  isHit,
  nudge,
  randomTarget,
  toFrequency,
  toPosition,
} from './frequency'

describe('frequency', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('randomTarget_isRoundedTo2DigitsWithinRange', () => {
    for (const random of [0, 0.5, 0.999999]) {
      // Given a mocked random value
      vi.spyOn(Math, 'random').mockReturnValue(random)

      // When drawing a target
      const target = randomTarget()

      // Then it has 2 significant digits within [F_MIN, F_MAX]
      expect(Number(target.toPrecision(2))).toBe(target)
      expect(target).toBeGreaterThanOrEqual(F_MIN)
      expect(target).toBeLessThanOrEqual(F_MAX)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(randomTarget()).toBe(1200)
  })

  it('toPosition_mapsLogarithmicallyAndRoundTrips', () => {
    expect(toPosition(F_MIN)).toBe(0)
    expect(toPosition(F_MAX)).toBeCloseTo(1)
    expect(toPosition(Math.sqrt(F_MIN * F_MAX))).toBeCloseTo(0.5)
    for (const frequency of [100, 440, 1225, 9000, 15000]) {
      expect(toFrequency(toPosition(frequency))).toBeCloseTo(frequency)
    }
  })

  it('bounds_ofCenter_spansHalfAnOctaveRoundedTo10', () => {
    // Given the mockup center (geometric middle of 600-850 Hz)
    const center = Math.sqrt(600 * 850)

    // When computing its bounds
    const { low, high } = bounds(center)

    // Then they are rounded to 10 Hz with a √2 ratio
    expect(low).toBe(600)
    expect(high).toBe(850)
  })

  it('clampCenter_keepsBoundsWithinRange', () => {
    expect(clampCenter(10)).toBe(CENTER_MIN)
    expect(clampCenter(100000)).toBe(CENTER_MAX)
    expect(clampCenter(1000)).toBe(1000)
    expect(bounds(CENTER_MIN)).toEqual({ low: F_MIN, high: 140 })
    expect(bounds(CENTER_MAX)).toEqual({ low: 11000, high: F_MAX })
  })

  it('nudge_alwaysChangesDisplayedBounds', () => {
    for (const [start, factor, end] of [
      [CENTER_MIN, ARROW_STEP, CENTER_MAX],
      [CENTER_MAX, 1 / ARROW_STEP, CENTER_MIN],
    ] as const) {
      // Given the selector at one end of the range
      let center = start
      while (center !== end) {
        // When nudging it toward the other end
        const next = nudge(center, factor)

        // Then each nudge changes a displayed bound, unless it stops at the end of the range
        if (next !== end) expect(bounds(next)).not.toEqual(bounds(center))
        center = next
      }
    }
  })

  it('isHit_ofTargetOnADisplayedBound_isTrue', () => {
    const center = Math.sqrt(600 * 850)
    expect(isHit(600, center)).toBe(true)
    expect(isHit(850, center)).toBe(true)
    expect(isHit(720, center)).toBe(true)
    expect(isHit(590, center)).toBe(false)
    expect(isHit(860, center)).toBe(false)
  })
})
