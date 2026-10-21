import { afterEach, describe, expect, it, vi } from 'vitest'
import { choicesOf, chordsOf, inversionCountOf, labelOf, randomQuestion, targetLabel, voicing, type Question } from './chord'

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
  })

  it('choicesOf_keepsAtMost5ChordsIncludingTheTargetInTableOrder', () => {
    // Beginner and Intermediate offer every chord of the level
    expect(choicesOf('beginner', chord('minor')).map((c) => c.name)).toEqual(['major', 'minor'])
    expect(choicesOf('intermediate', chord('major')).map((c) => c.name)).toEqual(['major', 'minor', 'diminished', 'augmented'])

    // Advanced and Expert offer the target and 4 other chords of the level, in table order
    for (const level of ['advanced', 'expert'] as const) {
      for (const target of chordsOf(level)) {
        const choices = choicesOf(level, target)
        expect(choices).toHaveLength(5)
        expect(choices).toContain(target)
        expect(choices).toEqual(chordsOf(level).filter((c) => choices.includes(c)))
      }
    }
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

  it('targetLabel_namesTheChordAndTheInversionOnlyWhenShown', () => {
    expect(targetLabel('beginner', question('minor', 0))).toBe('minor')
    expect(targetLabel('advanced', question('m7', 0))).toBe('m7 (minor + 7)')
    expect(targetLabel('expert', question('maj7', 1))).toBe('maj7 (major + maj7), 1st inversion')
    expect(targetLabel('expert', question('sus4', 0))).toBe('sus4')
  })
})
