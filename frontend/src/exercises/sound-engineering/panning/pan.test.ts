import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  bounds,
  centerMaxOf,
  centerMinOf,
  clampCenter,
  formatPan,
  isHit,
  PAN_MAX,
  PAN_MIN,
  randomTarget,
  toPan,
  toPosition,
} from './pan'
import { LEVELS } from '../../pitch/intervals/interval'

describe('pan', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('formatPan_usesTheDawConvention', () => {
    expect(formatPan(-100)).toBe('L100')
    expect(formatPan(0)).toBe('C')
    expect(formatPan(35)).toBe('R35')
  })

  it('randomTarget_isAnIntegerWithinRange', () => {
    for (const [random, expected] of [
      [0, PAN_MIN],
      [0.5, 0],
      [0.999999, PAN_MAX],
    ] as const) {
      // Given a mocked random value
      vi.spyOn(Math, 'random').mockReturnValue(random)

      // When drawing a target
      // Then it is the matching integer pan
      expect(randomTarget()).toBe(expected)
    }
  })

  it('toPosition_mapsLinearlyAndRoundTrips', () => {
    expect(toPosition(PAN_MIN)).toBe(0)
    expect(toPosition(0)).toBe(0.5)
    expect(toPosition(PAN_MAX)).toBe(1)
    for (const pan of [-100, -37, 0, 1, 64, 100]) {
      expect(toPan(toPosition(pan))).toBe(pan)
    }
  })

  it('bounds_narrowWithTheLevel', () => {
    expect(bounds('beginner', 0)).toEqual({ low: -25, high: 25 })
    expect(bounds('intermediate', 0)).toEqual({ low: -15, high: 15 })
    expect(bounds('advanced', 0)).toEqual({ low: -10, high: 10 })
    expect(bounds('expert', 30)).toEqual({ low: 24, high: 36 })
  })

  it('clampCenter_keepsBoundsWithinRange', () => {
    for (const { level } of LEVELS) {
      expect(clampCenter(level, -1000)).toBe(centerMinOf(level))
      expect(clampCenter(level, 1000)).toBe(centerMaxOf(level))
      expect(clampCenter(level, 0)).toBe(0)
      expect(bounds(level, centerMinOf(level)).low).toBe(PAN_MIN)
      expect(bounds(level, centerMaxOf(level)).high).toBe(PAN_MAX)
    }
  })

  it('isHit_ofTargetOnABound_isTrue', () => {
    expect(isHit('intermediate', -15, 0)).toBe(true)
    expect(isHit('intermediate', 15, 0)).toBe(true)
    expect(isHit('intermediate', 0, 0)).toBe(true)
    expect(isHit('intermediate', -16, 0)).toBe(false)
    expect(isHit('intermediate', 16, 0)).toBe(false)
  })
})
