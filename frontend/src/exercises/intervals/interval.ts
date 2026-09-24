export type Level = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export const LEVELS: readonly { level: Level; name: string }[] = [
  { level: 'beginner', name: 'Beginner' },
  { level: 'intermediate', name: 'Intermediate' },
  { level: 'advanced', name: 'Advanced' },
  { level: 'expert', name: 'Expert' },
]

export type Interval = { readonly stop: string; readonly qualifier?: string; readonly semitones: number }

// Augmented 4th and diminished 5th are the same 6 semitones: either answer is correct.
const SIMPLE_INTERVALS: readonly Interval[] = [
  { stop: '2nd', qualifier: 'minor', semitones: 1 },
  { stop: '2nd', qualifier: 'major', semitones: 2 },
  { stop: '3rd', qualifier: 'minor', semitones: 3 },
  { stop: '3rd', qualifier: 'major', semitones: 4 },
  { stop: '4th', semitones: 5 },
  { stop: 'Tritone', qualifier: 'augmented 4th', semitones: 6 },
  { stop: 'Tritone', qualifier: 'diminished 5th', semitones: 6 },
  { stop: '5th', semitones: 7 },
  { stop: '6th', qualifier: 'minor', semitones: 8 },
  { stop: '6th', qualifier: 'major', semitones: 9 },
  { stop: '7th', qualifier: 'minor', semitones: 10 },
  { stop: '7th', qualifier: 'major', semitones: 11 },
  { stop: 'Octave', semitones: 12 },
]

const SIMPLE_SEMITONES: Record<Level, readonly number[]> = {
  beginner: [1, 2, 3, 4, 5, 7, 12],
  intermediate: [1, 2, 3, 4, 5, 6, 7, 9, 10, 12],
  advanced: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  expert: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
}

export const isExpert = (level: Level) => level === 'expert'
export const isHarmonic = (level: Level) => level === 'advanced' || level === 'expert'

const intervalsOf = (level: Level) => SIMPLE_INTERVALS.filter((i) => SIMPLE_SEMITONES[level].includes(i.semitones))

export const stopsOf = (level: Level) => [...new Set(intervalsOf(level).map((i) => i.stop))]

// A single option means the quality is implicit (no qualifier buttons).
export const optionsOf = (level: Level, stop: string) => intervalsOf(level).filter((i) => i.stop === stop)

export const poolOf = (level: Level) =>
  (isExpert(level) ? [0, 1, 2] : [0]).flatMap((octaves) => SIMPLE_SEMITONES[level].map((s) => s + 12 * octaves))

const octaveSuffix = (octaves: number) => ['', ' + 1 octave', ' + 2 octaves'][octaves] ?? ''

export const intervalName = ({ stop, qualifier }: Interval) =>
  qualifier === undefined ? stop : stop === 'Tritone' ? qualifier : `${qualifier} ${stop}`

export const answerName = (stop: string, maybeInterval: Interval | undefined, octaves: number) =>
  (maybeInterval ? intervalName(maybeInterval) : stop) + octaveSuffix(octaves)

// Octave is 12 semitones, so 24 is "Octave + 1 octave" rather than "minor 2nd + 2 octaves".
const split = (semitones: number) => {
  const octaves = Math.floor((semitones - 1) / 12)
  return { simple: semitones - 12 * octaves, octaves }
}

export const stopOfTarget = (semitones: number) =>
  SIMPLE_INTERVALS.find((i) => i.semitones === split(semitones).simple)!.stop

export function targetName(semitones: number) {
  const { simple, octaves } = split(semitones)
  const name =
    simple === 6
      ? 'tritone (augmented 4th / diminished 5th)'
      : intervalName(SIMPLE_INTERVALS.find((i) => i.semitones === simple)!)
  return name + octaveSuffix(octaves)
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
