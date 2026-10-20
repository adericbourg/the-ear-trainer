import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BANDS,
  damageDb,
  eqGainDb,
  feedbackLevel,
  FLAT_EQ,
  formatFrequency,
  isHit,
  isOverCut,
  isSuppressed,
  randomFeedbacks,
  type Eq,
} from './eq'

// A careful fix for each band: just enough cut on the feedback, with the control meant for it.
const fixLow = (frequency: number): Partial<Eq> => ({ lowCut: frequency * 1.4 })
const fixMid = (frequency: number): Partial<Eq> => ({ midFrequency: frequency, mid: -8 })
const fixHigh = (): Partial<Eq> => ({ high: -15 })

describe('eq', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('eqGainDb_matchesEachFilterAtItsFrequency', () => {
    // Given a flat EQ, Then it changes nothing (the low cut, off at 20 Hz, barely touches 50 Hz)
    for (const frequency of [50, 1000, 15000]) expect(eqGainDb(FLAT_EQ, frequency)).toBeCloseTo(0, 0)

    // Given a mid cut, Then its center is cut by its gain, and an octave away by less
    const eq = { ...FLAT_EQ, midFrequency: 2000, mid: -12 }
    expect(eqGainDb(eq, 2000)).toBeCloseTo(-12)
    expect(eqGainDb(eq, 4000)).toBeGreaterThan(-6)

    // Given a low cut, Then its cutoff is at -3 dB (Butterworth) and an octave below at about -12 dB
    expect(eqGainDb({ ...FLAT_EQ, lowCut: 200 }, 200)).toBeCloseTo(-3, 0)
    expect(eqGainDb({ ...FLAT_EQ, lowCut: 200 }, 100)).toBeCloseTo(-12.3, 0)

    // Given a shelf, Then it is at half its gain on its frequency
    expect(eqGainDb({ ...FLAT_EQ, high: -12 }, 8000)).toBeCloseTo(-6, 0)
    // And at about its full gain far from it (measured against the flat EQ, whose low cut touches 20 Hz)
    expect(eqGainDb({ ...FLAT_EQ, low: 12 }, 20) - eqGainDb(FLAT_EQ, 20)).toBeGreaterThan(11)
  })

  it('feedbackLevel_followsBoostsAndFallsToZeroWhenSuppressed', () => {
    const eqAt = (mid: number) => ({ ...FLAT_EQ, midFrequency: 1000, mid })
    // A boost makes it louder, by the boost: that's how feedback is found
    expect(feedbackLevel(eqAt(6), 1000)).toBeCloseTo(2, 1)
    expect(feedbackLevel(eqAt(15), 1000)).toBeCloseTo(5.6, 1)
    expect(feedbackLevel(eqAt(0), 1000)).toBeCloseTo(1)
    expect(feedbackLevel(eqAt(-3), 1000)).toBeCloseTo(0.5)
    expect(isSuppressed(eqAt(-3), 1000)).toBe(false)
    expect(feedbackLevel(eqAt(-6), 1000)).toBe(0)
    expect(isSuppressed(eqAt(-6), 1000)).toBe(true)
  })

  it('randomFeedbacks_pickBandsPerLevel', () => {
    // Given Math.random() = 0.5: the middle band, and each band's geometric center
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const center = (band: (typeof BANDS)[keyof typeof BANDS]) => Number(Math.sqrt(band.min * band.max).toPrecision(2))

    expect(randomFeedbacks('beginner')).toEqual([center(BANDS.mid)])
    expect(randomFeedbacks('intermediate')).toEqual([center(BANDS.mid)])
    // Advanced leaves out one band: the middle one here
    expect(randomFeedbacks('advanced')).toEqual([center(BANDS.low), center(BANDS.high)])
    expect(randomFeedbacks('expert')).toEqual([center(BANDS.low), center(BANDS.mid), center(BANDS.high)])

    // Given the lowest draw, Then frequencies stay within their band
    vi.mocked(Math.random).mockReturnValue(0)
    expect(randomFeedbacks('intermediate')).toEqual([BANDS.low.min])
    expect(randomFeedbacks('beginner')).toEqual([BANDS.mid.min])
  })

  it('isHit_ofACarefulFixOnEveryBandEdge_isTrue', () => {
    // Given the hardest case: one feedback per band, at the edges of the bands
    for (const [low, mid, high] of [
      [BANDS.low.min, BANDS.mid.min, BANDS.high.min],
      [BANDS.low.max, BANDS.mid.max, BANDS.high.max],
    ] as const) {
      const eq = { ...FLAT_EQ, ...fixLow(low), ...fixMid(mid), ...fixHigh() }

      // Then the careful fix suppresses all of them without over-cutting
      expect(isHit('expert', [low, mid, high], eq), `${low} ${mid} ${high}: ${damageDb(eq)} dB`).toBe(true)
    }
  })

  it('isHit_whenOneFeedbackRingsOrOverCut_isFalse', () => {
    // Given two feedbacks, only one fixed
    expect(isHit('intermediate', [1000, 10000], { ...FLAT_EQ, ...fixMid(1000) })).toBe(false)

    // Given a brute-force fix: everything cut
    const bruteForce = { lowCut: 400, low: -15, midFrequency: 1000, mid: -15, high: -15 }

    // Then it over-cuts on Advanced and Expert only
    expect(isHit('intermediate', [1000], bruteForce)).toBe(true)
    expect(isOverCut('intermediate', bruteForce)).toBe(false)
    expect(isHit('advanced', [100, 1000], bruteForce)).toBe(false)
    expect(isOverCut('expert', bruteForce)).toBe(true)
    expect(isOverCut('expert', FLAT_EQ)).toBe(false)
  })

  it('damageDb_ignoresBoosts', () => {
    expect(damageDb(FLAT_EQ)).toBeCloseTo(0, 1)
    expect(damageDb({ ...FLAT_EQ, mid: 15, high: 15 })).toBeCloseTo(0, 1)
  })

  it('formatFrequency_usesKiloHertzAbove1000', () => {
    expect(formatFrequency(250)).toBe('250 Hz')
    expect(formatFrequency(1234)).toBe('1.2 kHz')
    expect(formatFrequency(10000)).toBe('10 kHz')
  })
})
