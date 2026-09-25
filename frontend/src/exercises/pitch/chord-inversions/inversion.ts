import type { Level } from '../intervals/interval'
import { chordsOf, INVERSION_NAMES, inversionCountOf, isRootPositionOnly, questionOf, type Chord, type Question } from '../chord-types/chord'

const BASSES = ['root', '3rd', '5th', '7th']

// The 9th of an add9 is never in the bass: its inversions would be the major triad's.
export const poolOf = (level: Level) => chordsOf(level).filter((c) => !isRootPositionOnly(c.triad) && c.extension !== 'add9')

const countOf = (chord: Chord) => inversionCountOf(chord.triad, chord.extension)

// Level-wide, so that the buttons don't tell whether the chord is a 7th chord.
export const inversionsOf = (level: Level) => INVERSION_NAMES.slice(0, Math.max(...poolOf(level).map(countOf)))

export function randomQuestion(level: Level): Question {
  const pool = poolOf(level)
  const chord = pool[Math.floor(Math.random() * pool.length)]!
  return questionOf(level, chord, Math.floor(Math.random() * countOf(chord)))
}

export const solutionOf = (inversion: number) => `${INVERSION_NAMES[inversion]} (${BASSES[inversion]} in the bass)`

export const recapLabel = ({ chord, inversion }: Question) => `${chord.name}, ${INVERSION_NAMES[inversion]}`
