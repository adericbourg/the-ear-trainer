import { afterEach, describe, expect, it, vi } from 'vitest'
import { inversionCountOf, type Question } from '../chords/chord'
import { inversionsOf, poolOf, randomQuestion, recapLabel, solutionOf } from './inversion'

describe('inversion', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('poolOf_eachLevel_matchesTheSpec', () => {
    expect(poolOf('beginner').map((c) => c.name)).toEqual(['major', 'minor'])
    expect(poolOf('intermediate').map((c) => c.name)).toEqual(['major', 'minor', 'diminished'])
    expect(poolOf('advanced').map((c) => c.name)).toEqual(['major', 'minor', 'diminished', 'maj7', 'dominant 7', 'm7'])
    expect(poolOf('expert').map((c) => c.name)).toEqual(['major', 'minor', 'diminished', 'maj7', 'dominant 7', 'm7', 'm7♭5'])
  })

  it('inversionsOf_dependsOnTheLevelOnly', () => {
    expect(inversionsOf('beginner')).toEqual(['root position', '1st inversion', '2nd inversion'])
    expect(inversionsOf('intermediate')).toEqual(['root position', '1st inversion', '2nd inversion'])
    expect(inversionsOf('advanced')).toEqual(['root position', '1st inversion', '2nd inversion', '3rd inversion'])
    expect(inversionsOf('expert')).toEqual(['root position', '1st inversion', '2nd inversion', '3rd inversion'])
  })

  it('randomQuestion_keepsInversionsVoicingsAndRegister', () => {
    for (const [level, lowest, isOpen] of [
      ['beginner', 48, false],
      ['intermediate', 48, false],
      ['advanced', 48, false],
      ['expert', 36, true],
    ] as const) {
      for (const random of [0, 0.999999]) {
        // Given extreme random values
        vi.spyOn(Math, 'random').mockReturnValue(random)

        // When drawing a question
        const { chord, inversion, notes } = randomQuestion(level)

        // Then the inversion exists for the chord, notes go up from the bass and stay in the register
        expect(inversion).toBeLessThan(inversionCountOf(chord.triad, chord.extension))
        expect(notes).toEqual([...notes].sort((a, b) => a - b))
        expect(notes[0]).toBeGreaterThanOrEqual(lowest)
        expect(notes.at(-1)).toBeLessThanOrEqual(84)
        // And only Expert spreads the chord over more than an octave
        expect(notes.at(-1)! - notes[0]! > 12).toBe(isOpen)
      }
    }
  })

  it('randomQuestion_whenRandomIsHighest_drawsTheLastInversionOfTheLastChord', () => {
    // Given the highest random value
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)

    // When drawing an Expert question
    const { chord, inversion } = randomQuestion('expert')

    // Then it is the m7♭5 with its 7th in the bass
    expect(chord.name).toBe('m7♭5')
    expect(inversion).toBe(3)
  })

  it('solutionOf_namesTheInversionAndItsBass', () => {
    expect(solutionOf(0)).toBe('root position (root in the bass)')
    expect(solutionOf(1)).toBe('1st inversion (3rd in the bass)')
    expect(solutionOf(2)).toBe('2nd inversion (5th in the bass)')
    expect(solutionOf(3)).toBe('3rd inversion (7th in the bass)')
  })

  it('recapLabel_namesTheChordAndTheInversion', () => {
    // Given a maj7 in 1st inversion
    const question: Question = { chord: poolOf('advanced')[3]!, inversion: 1, notes: [], label: '' }

    // When / Then
    expect(recapLabel(question)).toBe('maj7, 1st inversion')
  })
})
