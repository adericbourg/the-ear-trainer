import { afterEach, describe, expect, it, vi } from 'vitest'
import { answerName, optionsOf, poolOf, randomQuestion, stopOfTarget, stopsOf, targetName, toFrequency } from './interval'

describe('interval', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('poolOf_eachLevel_matchesTheSpec', () => {
    expect(poolOf('beginner')).toEqual([1, 2, 3, 4, 5, 7, 12])
    expect(poolOf('intermediate')).toEqual([1, 2, 3, 4, 5, 6, 7, 9, 10, 12])
    expect(poolOf('advanced')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(poolOf('expert')).toEqual(Array.from({ length: 36 }, (_, i) => i + 1))
  })

  it('stopsOf_andOptionsOf_giveQualifiersOnlyWhenTwoQualitiesArePooled', () => {
    expect(stopsOf('beginner')).toEqual(['2nd', '3rd', '4th', '5th', 'Octave'])
    expect(stopsOf('advanced')).toEqual(['2nd', '3rd', '4th', 'Tritone', '5th', '6th', '7th', 'Octave'])
    expect(optionsOf('beginner', '3rd').map((i) => i.qualifier)).toEqual(['minor', 'major'])
    expect(optionsOf('beginner', '4th')).toEqual([{ stop: '4th', semitones: 5 }])
    expect(optionsOf('intermediate', 'Tritone').map((i) => i.semitones)).toEqual([6, 6])
    expect(optionsOf('intermediate', '6th')).toEqual([{ stop: '6th', qualifier: 'major', semitones: 9 }])
    expect(optionsOf('intermediate', '7th')).toEqual([{ stop: '7th', qualifier: 'minor', semitones: 10 }])
    expect(optionsOf('advanced', '6th')).toHaveLength(2)
  })

  it('answerName_andTargetName_useDisplayNames', () => {
    const [minorThird] = optionsOf('expert', '3rd')
    const [augmentedFourth] = optionsOf('expert', 'Tritone')
    expect(answerName('3rd', minorThird, 1)).toBe('minor 3rd + 1 octave')
    expect(answerName('3rd', undefined, 0)).toBe('3rd')
    expect(answerName('Tritone', augmentedFourth, 2)).toBe('augmented 4th + 2 octaves')
    expect(targetName(5)).toBe('4th')
    expect(targetName(12)).toBe('Octave')
    expect(targetName(15)).toBe('minor 3rd + 1 octave')
    expect(targetName(18)).toBe('tritone (augmented 4th / diminished 5th) + 1 octave')
    expect(targetName(36)).toBe('Octave + 2 octaves')
    expect(stopOfTarget(30)).toBe('Tritone')
  })

  it('randomQuestion_neverRepeatsThePreviousInterval', () => {
    // Given a random value that would draw the first interval of the pool
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(randomQuestion('beginner').semitones).toBe(1)

    // When drawing after that interval
    // Then another one is drawn
    expect(randomQuestion('beginner', 1).semitones).toBe(2)
  })

  it('randomQuestion_keepsNotesInRegister', () => {
    for (const [level, lowest] of [
      ['beginner', 48],
      ['expert', 36],
    ] as const) {
      for (const random of [0, 0.999999]) {
        // Given extreme random values
        vi.spyOn(Math, 'random').mockReturnValue(random)

        // When drawing a question
        const { semitones, notes } = randomQuestion(level)

        // Then both notes lie in the register, the lower one at an end of its range
        expect(Math.abs(notes[1] - notes[0])).toBe(semitones)
        expect(Math.min(...notes)).toBe(random === 0 ? lowest : 84 - semitones)
        expect(Math.max(...notes)).toBeLessThanOrEqual(84)
      }
    }
  })

  it('randomQuestion_descendsOnlyInIntermediate', () => {
    // Given a random value below 0.5
    vi.spyOn(Math, 'random').mockReturnValue(0.2)

    // When drawing questions
    // Then only Intermediate plays the upper note first
    const [first, second] = randomQuestion('intermediate').notes
    expect(first).toBeGreaterThan(second)
    for (const level of ['beginner', 'advanced', 'expert'] as const) {
      const [low, high] = randomQuestion(level).notes
      expect(low).toBeLessThan(high)
    }
  })

  it('toFrequency_ofA4_is440Hz', () => {
    expect(toFrequency(69)).toBe(440)
    expect(toFrequency(81)).toBe(880)
    expect(toFrequency(60)).toBeCloseTo(261.63, 2)
  })
})
