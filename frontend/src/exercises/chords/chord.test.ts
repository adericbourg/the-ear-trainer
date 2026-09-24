import { afterEach, describe, expect, it, vi } from 'vitest'
import { chordsOf, extensionsOf, feedback, inversionCountOf, labelOf, randomQuestion, triadsOf, voicing, type Question } from './chord'

const chord = (name: string) => chordsOf('expert').find((c) => c.name === name)!
const question = (name: string, inversion: number): Question => ({ chord: chord(name), inversion, notes: [], label: '' })

describe('chord', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('chordsOf_eachLevel_matchesTheSpec', () => {
    expect(chordsOf('beginner').map((c) => c.name)).toEqual(['major', 'minor'])
    expect(chordsOf('intermediate').map((c) => c.name)).toEqual(['major', 'minor', 'diminished', 'augmented'])
    expect(chordsOf('advanced').map((c) => c.name)).toEqual(['major', 'minor', 'diminished', 'augmented', 'maj7', 'dominant 7', 'm7'])
    expect(chordsOf('expert')).toHaveLength(11)
    expect(triadsOf('advanced')).toEqual(['major', 'minor', 'diminished', 'augmented'])
    expect(triadsOf('expert')).toEqual(['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'])
    expect(extensionsOf('intermediate')).toEqual(['none'])
    expect(extensionsOf('advanced')).toEqual(['none', '7', 'maj7'])
    expect(extensionsOf('expert')).toEqual(['none', '7', 'maj7', 'add9'])
  })

  it('inversionCountOf_dependsOnTheChord', () => {
    expect(inversionCountOf('major', 'none')).toBe(3)
    expect(inversionCountOf('minor', '7')).toBe(4)
    expect(inversionCountOf('major', 'maj7')).toBe(4)
    expect(inversionCountOf('major', 'add9')).toBe(3)
    expect(inversionCountOf('augmented', 'none')).toBe(1)
    expect(inversionCountOf('sus4', '7')).toBe(1)
  })

  it('labelOf_spellsFromTheTheory', () => {
    const label = (root: string, name: string, inversion = 0, isOpen = false) =>
      labelOf(root, chord(name), voicing(chord(name), inversion, isOpen))
    expect(label('C', 'maj7', 1)).toBe('Cmaj7/E: E G B C')
    expect(label('C', 'augmented')).toBe('Caug: C E G♯')
    expect(label('E♭', 'diminished')).toBe('E♭dim: E♭ G♭ B♭♭')
    expect(label('F♯', 'augmented')).toBe('F♯aug: F♯ A♯ C♯♯')
    expect(label('C', 'm7♭5')).toBe('Cm7♭5: C E♭ G♭ B♭')
    expect(label('C', 'sus4')).toBe('Csus4: C F G')
    expect(label('B', 'sus2')).toBe('Bsus2: B C♯ F♯')
    expect(label('A♭', 'dominant 7', 3)).toBe('A♭7/G♭: G♭ A♭ C E♭')
    expect(label('D', 'minor', 2)).toBe('Dm/A: A D F')
  })

  it('voicing_keepsTheBassAndThe9thAboveThe5th', () => {
    const semitones = (name: string, inversion: number, isOpen: boolean) => voicing(chord(name), inversion, isOpen).map((t) => t.semitones)
    expect(semitones('add9', 0, false)).toEqual([0, 4, 7, 14])
    expect(semitones('add9', 0, true)).toEqual([0, 7, 14, 16])
    expect(semitones('add9', 2, false)).toEqual([7, 12, 14, 16])
    // Open voicings spread over more than an octave, with the same bass
    expect(semitones('major', 1, true)).toEqual([4, 12, 19])
    expect(semitones('maj7', 3, true)).toEqual([11, 16, 19, 24])
  })

  it('randomQuestion_keepsNotesInRegister', () => {
    for (const [level, lowest] of [
      ['beginner', 48],
      ['advanced', 48],
      ['expert', 36],
    ] as const) {
      for (const random of [0, 0.999999]) {
        // Given extreme random values
        vi.spyOn(Math, 'random').mockReturnValue(random)

        // When drawing a question
        const { notes } = randomQuestion(level)

        // Then notes go up from the bass and stay in the register
        expect(notes).toEqual([...notes].sort((a, b) => a - b))
        expect(notes[0]).toBeGreaterThanOrEqual(lowest)
        expect(notes.at(-1)).toBeLessThanOrEqual(84)
      }
    }
  })

  it('randomQuestion_invertsAndOpensOnlyInExpert', () => {
    // Given a random value in the middle of every range
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    // When drawing questions
    // Then Beginner plays a close root position, Expert an open 2nd inversion
    expect(randomQuestion('beginner')).toEqual({ chord: chord('minor'), inversion: 0, notes: [66, 69, 73], label: 'F♯m: F♯ A C♯' })
    expect(randomQuestion('expert')).toEqual({
      chord: chord('dominant 7'),
      inversion: 2,
      notes: [61, 66, 70, 76],
      label: 'F♯7/C♯: C♯ F♯ A♯ E',
    })
  })

  it('feedback_gradesOnlyTheGroupsOfTheLevel', () => {
    // Beginner and Intermediate only grade the triad
    expect(feedback('beginner', question('minor', 0), { triad: 'minor', extension: 'none', inversion: 0 })).toEqual({
      isHit: true,
      text: 'You guessed right! It was a minor.',
    })
    expect(feedback('intermediate', question('augmented', 0), { triad: 'major', extension: 'none', inversion: 0 }).text).toBe(
      'Wrong triad. It was an augmented.',
    )

    // Advanced adds the extension
    expect(feedback('advanced', question('m7', 0), { triad: 'minor', extension: 'maj7', inversion: 0 }).text).toBe(
      'Right triad, wrong extension. It was a m7 (minor + 7).',
    )
    expect(feedback('advanced', question('m7', 0), { triad: 'major', extension: 'none', inversion: 0 }).text).toBe(
      'Wrong triad and extension. It was a m7 (minor + 7).',
    )

    // Expert adds the inversion, except for root-position-only chords
    expect(feedback('expert', question('maj7', 1), { triad: 'major', extension: 'maj7', inversion: 2 }).text).toBe(
      'Right chord, wrong inversion. It was a maj7 (major + maj7), 1st inversion.',
    )
    expect(feedback('expert', question('maj7', 1), { triad: 'minor', extension: 'maj7', inversion: 2 }).text).toBe(
      'Right extension, wrong triad and inversion. It was a maj7 (major + maj7), 1st inversion.',
    )
    expect(feedback('expert', question('sus4', 0), { triad: 'sus4', extension: 'none', inversion: 0 })).toEqual({
      isHit: true,
      text: 'You guessed right! It was a sus4.',
    })
  })
})
