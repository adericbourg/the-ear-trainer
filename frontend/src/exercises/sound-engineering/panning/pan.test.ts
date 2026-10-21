import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  bounds,
  centerMaxOf,
  centerMinOf,
  formatPan,
  PAN_MAX,
  PAN_MIN,
  randomSound,
  randomTarget,
  subjectOf,
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
      // Then its pan is the matching integer
      expect(randomTarget().pan).toBe(expected)
    }
  })

  it('randomSound_drawsEachKindOfSound', () => {
    for (const [random, kind, subject] of [
      [0, 'noise', 'The pink noise was'],
      [0.2, 'tone', 'The tone was'],
      [0.4, 'pulses', 'The pulsed tone was'],
      [0.6, 'chords', 'The piano chords were'],
      [0.999999, 'sample', 'The vocals were'],
    ] as const) {
      // Given a mocked random value
      vi.spyOn(Math, 'random').mockReturnValue(random)

      // When drawing a sound
      const sound = randomSound()

      // Then it is the matching kind
      expect(sound.kind).toBe(kind)
      expect(subjectOf(sound)).toBe(subject)
    }
  })

  it('randomSound_ofTones_staysBetweenA3AndA5', () => {
    for (const [kindRandom, noteRandom, frequency] of [
      [0.2, 0, 220],
      [0.4, 0.999999, 880],
    ] as const) {
      // Given mocked random values drawing a tone or pulses, then the lowest or highest note
      vi.spyOn(Math, 'random').mockReturnValueOnce(kindRandom).mockReturnValueOnce(noteRandom)

      // When drawing a sound
      const sound = randomSound()

      // Then its frequency is the matching note
      expect(sound).toHaveProperty('frequency', frequency)
    }
  })

  it('randomSound_ofChords_isAProgressionInHertz', () => {
    // Given a mocked random value drawing chords
    vi.spyOn(Math, 'random').mockReturnValue(0.6)

    // When drawing a sound
    const sound = randomSound()

    // Then each chord is a bass and 3 voices, in audible frequencies
    if (sound.kind !== 'chords') throw new Error(`Expected chords, got ${sound.kind}`)
    expect(sound.chords.length).toBeGreaterThan(0)
    for (const chord of sound.chords) {
      expect(chord).toHaveLength(4)
      for (const frequency of chord) expect(frequency).toBeGreaterThan(80)
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

  it('centerMinOf_andCenterMaxOf_keepBoundsWithinRange', () => {
    for (const { level } of LEVELS) {
      expect(bounds(level, centerMinOf(level)).low).toBe(PAN_MIN)
      expect(bounds(level, centerMaxOf(level)).high).toBe(PAN_MAX)
    }
  })
})
