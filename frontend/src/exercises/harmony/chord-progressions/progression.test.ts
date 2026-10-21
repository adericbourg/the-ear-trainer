import { describe, expect, it } from 'vitest'
import { choicesOf, degreesOf, progressionsOf, questionOf } from './progression'
import { LEVELS } from '../../pitch/intervals/interval'

const progression = (name: string) => progressionsOf('expert').find((p) => p.name === name)!
const pitchClasses = (notes: readonly number[]) => notes.map((n) => n % 12).sort((a, b) => a - b)

describe('progression', () => {
  it('progressionsOf_eachLevel_addsLongerProgressionsToThePreviousOnes', () => {
    expect(progressionsOf('beginner').map((p) => p.name)).toEqual(['I IV', 'I V', 'IV I', 'V I', 'I I'])
    LEVELS.slice(1).forEach(({ level }, i) => {
      const previous = progressionsOf(LEVELS[i]!.level)
      expect(progressionsOf(level).filter((p) => previous.includes(p))).toEqual(previous)
      expect(progressionsOf(level).length).toBeGreaterThan(previous.length)
    })
    // Every degree of the library is known
    for (const p of progressionsOf('expert')) expect(degreesOf(p).every((d) => d !== undefined)).toBe(true)
  })

  it('choicesOf_keepsAtMost5ProgressionsIncludingTheTargetInTableOrder', () => {
    // Beginner offers every progression
    expect(choicesOf('beginner', progression('V I')).map((p) => p.name)).toEqual(['I IV', 'I V', 'IV I', 'V I', 'I I'])

    // Expert offers the target and 4 others, in table order
    for (const target of progressionsOf('expert')) {
      const choices = choicesOf('expert', target)
      expect(choices).toHaveLength(5)
      expect(choices).toContain(target)
      expect(choices).toEqual(progressionsOf('expert').filter((p) => choices.includes(p)))
    }
  })

  it('questionOf_ofBeginner_playsTheTonicChordThenARestThenTheProgression', () => {
    // Given V I in C
    // When building the question
    const { chords, key } = questionOf('beginner', progression('V I'), 0)

    // Then the tonic chord sets the key, a rest follows, then G and C, each with its root in the bass
    expect(key).toBe('C major')
    expect(chords).toHaveLength(4)
    expect(pitchClasses(chords[0]!)).toEqual([0, 0, 4, 7])
    expect(chords[0]![0]! % 12).toBe(0)
    expect(chords[1]).toEqual([])
    expect(pitchClasses(chords[2]!)).toEqual([2, 7, 7, 11])
    expect(chords[2]![0]! % 12).toBe(7)
    expect(pitchClasses(chords[3]!)).toEqual([0, 0, 4, 7])
  })

  it('questionOf_ofExpert_playsTheTonicNoteFirstAndNamesMinorKeys', () => {
    // Given the minor ii–V–i in A
    // When building the question
    const { chords, key } = questionOf('expert', progression('ii° V i'), 9)

    // Then only the tonic note sets the key, and the key is minor
    expect(key).toBe('A minor')
    expect(pitchClasses(chords[0]!)).toEqual([9])
    expect(chords[1]).toEqual([])
    expect(pitchClasses(chords[2]!)).toEqual([2, 5, 11, 11])
  })

  it('questionOf_movesUpperVoicesSmoothly', () => {
    // Given every progression in every key
    for (const p of progressionsOf('expert')) {
      for (let tonic = 0; tonic < 12; tonic++) {
        // When building the question
        const chords = questionOf('beginner', p, tonic).chords.filter((c) => c.length > 0)

        // Then no upper voice leaps more than a 4th from one chord to the next
        chords.slice(1).forEach((chord, i) => {
          chord.slice(1).forEach((note, voice) => expect(Math.abs(note - chords[i]![voice + 1]!)).toBeLessThanOrEqual(5))
        })
      }
    }
  })
})
