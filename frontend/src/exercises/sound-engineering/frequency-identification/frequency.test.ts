import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ARROW_STEP,
  bounds,
  centerMaxOf,
  centerMinOf,
  clampCenter,
  F_MAX,
  F_MIN,
  INITIAL_CENTER,
  isHit,
  nudge,
  randomTarget,
  toFrequency,
  toPosition,
} from './frequency'
import { LEVELS } from '../../pitch/intervals/interval'

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

    // When computing its bounds in Intermediate
    const { low, high } = bounds('intermediate', center)

    // Then they are rounded to 10 Hz with a √2 ratio
    expect(low).toBe(600)
    expect(high).toBe(850)
  })

  it('bounds_narrowWithTheLevel', () => {
    expect(bounds('beginner', INITIAL_CENTER)).toEqual({ low: 870, high: 1700 })
    expect(bounds('intermediate', INITIAL_CENTER)).toEqual({ low: 1000, high: 1500 })
    expect(bounds('advanced', INITIAL_CENTER)).toEqual({ low: 1100, high: 1400 })
    expect(bounds('expert', INITIAL_CENTER)).toEqual({ low: 1100, high: 1300 })
  })

  it('clampCenter_keepsBoundsWithinRange', () => {
    for (const { level } of LEVELS) {
      expect(clampCenter(level, 10)).toBe(centerMinOf(level))
      expect(clampCenter(level, 100000)).toBe(centerMaxOf(level))
      expect(clampCenter(level, 1000)).toBe(1000)
      expect(bounds(level, centerMinOf(level)).low).toBe(F_MIN)
      expect(bounds(level, centerMaxOf(level)).high).toBe(F_MAX)
    }
    expect(bounds('intermediate', centerMinOf('intermediate'))).toEqual({ low: F_MIN, high: 140 })
    expect(bounds('intermediate', centerMaxOf('intermediate'))).toEqual({ low: 11000, high: F_MAX })
  })

  it('nudge_alwaysChangesDisplayedBounds', () => {
    for (const { level } of LEVELS) {
      for (const [start, factor, end] of [
        [centerMinOf(level), ARROW_STEP, centerMaxOf(level)],
        [centerMaxOf(level), 1 / ARROW_STEP, centerMinOf(level)],
      ] as const) {
        // Given the selector at one end of the range
        let center = start
        while (center !== end) {
          // When nudging it toward the other end
          const next = nudge(level, center, factor)

          // Then each nudge changes a displayed bound, unless it stops at the end of the range
          if (next !== end) expect(bounds(level, next)).not.toEqual(bounds(level, center))
          center = next
        }
      }
    }
  })

  it('isHit_ofTargetOnADisplayedBound_isTrue', () => {
    const center = Math.sqrt(600 * 850)
    expect(isHit('intermediate', 600, center)).toBe(true)
    expect(isHit('intermediate', 850, center)).toBe(true)
    expect(isHit('intermediate', 720, center)).toBe(true)
    expect(isHit('intermediate', 590, center)).toBe(false)
    expect(isHit('intermediate', 860, center)).toBe(false)
  })
})
