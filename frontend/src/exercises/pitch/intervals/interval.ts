export type Level = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export const LEVELS: readonly { level: Level; name: string }[] = [
  { level: 'beginner', name: 'Beginner' },
  { level: 'intermediate', name: 'Intermediate' },
  { level: 'advanced', name: 'Advanced' },
  { level: 'expert', name: 'Expert' },
]

// Index = semitones - 1. Augmented 4th and diminished 5th sound the same: a single Tritone stop.
const NAMES = [
  'minor 2nd',
  'major 2nd',
  'minor 3rd',
  'major 3rd',
  '4th',
  'Tritone',
  '5th',
  'minor 6th',
  'major 6th',
  'minor 7th',
  'major 7th',
  'Octave',
]

const SIMPLE_SEMITONES: Record<Level, readonly number[]> = {
  beginner: [1, 2, 3, 4, 5, 7, 12],
  intermediate: [1, 2, 3, 4, 5, 6, 7, 9, 10, 12],
  advanced: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  expert: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
}

export const isExpert = (level: Level) => level === 'expert'
export const isHarmonic = (level: Level) => level === 'advanced' || level === 'expert'

// Stops are the simple intervals (1 to 12 semitones) of the level, in order.
export const stopsOf = (level: Level) => SIMPLE_SEMITONES[level]

export const poolOf = (level: Level) =>
  (isExpert(level) ? [0, 1, 2] : [0]).flatMap((octaves) => SIMPLE_SEMITONES[level].map((s) => s + 12 * octaves))

const octaveSuffix = (octaves: number) => ['', ' + 1 octave', ' + 2 octaves'][octaves] ?? ''

// Octave is 12 semitones, so 24 is "Octave + 1 octave" rather than "minor 2nd + 2 octaves".
const split = (semitones: number) => {
  const octaves = Math.floor((semitones - 1) / 12)
  return { simple: semitones - 12 * octaves, octaves }
}

export const stopName = (simple: number) => NAMES[simple - 1]!

export const simpleOf = (semitones: number) => split(semitones).simple

export const answerName = (simple: number, octaves: number) => stopName(simple) + octaveSuffix(octaves)

export function targetName(semitones: number) {
  const { simple, octaves } = split(semitones)
  return (simple === 6 ? 'tritone (augmented 4th / diminished 5th)' : stopName(simple)) + octaveSuffix(octaves)
}

const randomItem = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]!

const HIGHEST_NOTE = 84 // C6
const lowestNote = (level: Level) => (isExpert(level) ? 36 : 48) // C2 or C3

export type Question = { readonly semitones: number; readonly notes: readonly [number, number] }

// Notes are MIDI numbers, in playback order.
export function randomQuestion(level: Level, maybePrevious?: number): Question {
  const semitones = randomItem(poolOf(level).filter((s) => s !== maybePrevious))
  const low = lowestNote(level)
  const lower = low + Math.floor(Math.random() * (HIGHEST_NOTE - semitones - low + 1))
  const upper = lower + semitones
  const isDescending = level === 'intermediate' && Math.random() < 0.5
  return { semitones, notes: isDescending ? [upper, lower] : [lower, upper] }
}

export const toFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12)
