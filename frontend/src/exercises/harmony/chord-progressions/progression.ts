import { LEVELS, randomItem, type Level } from '../../pitch/intervals/interval'

const MAJOR = [0, 4, 7]
const MINOR = [0, 3, 7]
const DIMINISHED = [0, 3, 6]

// Root in semitones above the tonic, and the triad built on it.
type Degree = { readonly root: number; readonly triad: readonly number[] }

const DEGREES: Record<string, Degree> = {
  I: { root: 0, triad: MAJOR },
  ii: { root: 2, triad: MINOR },
  iii: { root: 4, triad: MINOR },
  IV: { root: 5, triad: MAJOR },
  V: { root: 7, triad: MAJOR },
  vi: { root: 9, triad: MINOR },
  'vii°': { root: 11, triad: DIMINISHED },
  // Minor keys and chords borrowed from them.
  i: { root: 0, triad: MINOR },
  'ii°': { root: 2, triad: DIMINISHED },
  '♭III': { root: 3, triad: MAJOR },
  iv: { root: 5, triad: MINOR },
  v: { root: 7, triad: MINOR },
  '♭VI': { root: 8, triad: MAJOR },
  '♭VII': { root: 10, triad: MAJOR },
  II: { root: 2, triad: MAJOR },
}

// The name lists the degrees; the note is a "by the way" shown with the answer, when the progression is a known one.
export type Progression = { readonly name: string; readonly note?: string }

const PERFECT_CADENCE = 'It ends on a perfect cadence (authentic cadence), the strongest way to close a phrase.'
const HALF_CADENCE = 'It ends on a half cadence: the phrase stays open, waiting for more.'
const DECEPTIVE_CADENCE = 'It ends on a deceptive cadence: V resolves to vi instead of I.'

const PROGRESSIONS: readonly (Progression & { readonly since: Level })[] = [
  { name: 'I IV', since: 'beginner' },
  { name: 'I V', since: 'beginner', note: HALF_CADENCE },
  { name: 'IV I', since: 'beginner', note: 'A plagal cadence, the "Amen" at the end of hymns.' },
  { name: 'V I', since: 'beginner', note: 'A perfect cadence (authentic cadence), the strongest way to close a phrase.' },
  { name: 'I I', since: 'beginner' },
  { name: 'I IV V', since: 'intermediate', note: HALF_CADENCE },
  { name: 'I V I', since: 'intermediate', note: PERFECT_CADENCE },
  { name: 'IV V I', since: 'intermediate', note: PERFECT_CADENCE },
  { name: 'ii V I', since: 'intermediate', note: 'The ii–V–I, the backbone of jazz harmony.' },
  { name: 'I vi IV', since: 'intermediate' },
  { name: 'I IV I', since: 'intermediate', note: 'It ends on a plagal cadence, the "Amen" at the end of hymns.' },
  { name: 'I V vi', since: 'intermediate', note: DECEPTIVE_CADENCE },
  { name: 'I ii V', since: 'intermediate', note: HALF_CADENCE },
  { name: 'I vi IV V', since: 'advanced', note: 'The \'50s progression, a Doo-wop classic ("Stand by Me").' },
  { name: 'I V vi IV', since: 'advanced', note: 'The Axis progression, behind countless pop songs ("Let It Be").' },
  { name: 'vi IV I V', since: 'advanced', note: 'The Axis progression started on vi ("Zombie").' },
  { name: 'I IV V I', since: 'advanced', note: 'The textbook way to set a key, ending on a perfect cadence.' },
  { name: 'I vi ii V', since: 'advanced', note: 'The turnaround of "I Got Rhythm" and countless jazz standards.' },
  { name: 'IV V iii vi', since: 'advanced', note: 'The Royal Road progression, a staple of J-pop.' },
  { name: 'I V vi iii', since: 'advanced', note: "The first half of Pachelbel's Canon." },
  { name: 'I IV V vi', since: 'advanced', note: DECEPTIVE_CADENCE },
  { name: 'I iii IV V', since: 'advanced' },
  { name: 'ii V I vi', since: 'advanced' },
  { name: 'i ♭VII ♭VI V', since: 'expert', note: 'The Andalusian cadence, from flamenco to "Hit the Road Jack".' },
  { name: 'i ♭VII ♭VI ♭VII', since: 'expert', note: 'An Aeolian vamp, as in "All Along the Watchtower".' },
  { name: 'I ♭VII IV I', since: 'expert', note: 'A Mixolydian rock progression ("Sweet Child o\' Mine", the "Hey Jude" coda).' },
  { name: 'I ♭VI ♭VII I', since: 'expert', note: 'The "Mario cadence", the victory jingle of Super Mario Bros.' },
  { name: 'I iv I', since: 'expert', note: 'A minor plagal cadence: iv is borrowed from the minor key.' },
  { name: 'ii° V i', since: 'expert', note: 'The minor ii–V–i of jazz.' },
  { name: 'i iv v i', since: 'expert', note: 'Natural minor: the minor v has no leading tone, for an older, modal sound.' },
  { name: 'i iv V i', since: 'expert', note: 'Harmonic minor: the major V brings the leading tone back to i.' },
  { name: 'I II IV I', since: 'expert', note: 'The major II is a secondary dominant (V of V), as in "Eight Days a Week".' },
  { name: 'iii vi ii V I', since: 'expert', note: 'A chain of falling fifths landing on I.' },
  { name: 'IV vii° iii vi ii V I', since: 'expert', note: 'The full diatonic circle of fifths.' },
  { name: 'I V vi iii IV I IV V', since: 'expert', note: "Pachelbel's Canon, reused in countless pop songs." },
  { name: 'I iii vi IV', since: 'expert' },
  { name: 'vi ii V I', since: 'expert' },
  { name: 'I IV ii V', since: 'expert' },
  { name: 'I vi iii IV', since: 'expert' },
]

const rank = (level: Level) => LEVELS.findIndex((l) => l.level === level)

export const progressionsOf = (level: Level): readonly Progression[] => PROGRESSIONS.filter((p) => rank(p.since) <= rank(level))

export const degreesOf = ({ name }: Progression) => name.split(' ').map((degree) => DEGREES[degree])

const MAX_CHOICES = 5

// The progression and random others of the level, in table order so that a button's position gives nothing away.
export function choicesOf(level: Level, progression: Progression) {
  const others = progressionsOf(level).filter((p) => p !== progression)
  const picked = new Set([progression])
  while (picked.size < MAX_CHOICES && others.length > 0) picked.add(others.splice(Math.floor(Math.random() * others.length), 1)[0]!)
  return progressionsOf(level).filter((p) => picked.has(p))
}

const MAJOR_KEYS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
const MINOR_KEYS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B']

const mod = (n: number, m: number) => ((n % m) + m) % m

// MIDI ranges: the bass plays the root between E2 and D♯3, the 3 upper voices start between G3 and F♯4.
const BASS_LOWEST = 40
const UPPER_LOWEST = 55
const START_VOICING = [60, 64, 67]
const CUE_NOTE_LOWEST = 60

const distance = (a: readonly number[], b: readonly number[]) => a.reduce((sum, note, i) => sum + Math.abs(note - b[i]!), 0)

// The close-position voicing of the triad nearest to the previous one, so that each voice moves as little as possible.
// ponytail: greedy voice leading (one chord ahead), no parallel fifths check.
function upperVoices(root: number, triad: readonly number[], previous: readonly number[]) {
  const inversions = triad.map((_, i) => [...triad.slice(i), ...triad.slice(0, i).map((s) => s + 12)])
  const candidates = inversions.map((inversion) => {
    const lowest = UPPER_LOWEST + mod(root + inversion[0]! - UPPER_LOWEST, 12)
    return inversion.map((s) => lowest - inversion[0]! + s)
  })
  return candidates.reduce((best, c) => (distance(c, previous) < distance(best, previous) ? c : best))
}

// The tonic chord (easy levels) or the tonic note sets the key.
const isChordCue = (level: Level) => level === 'beginner' || level === 'intermediate'

export type Question = {
  readonly progression: Progression
  readonly key: string
  readonly cue: readonly number[]
  readonly chords: readonly (readonly number[])[]
}

// Notes are MIDI numbers, bass first. The tonic is a pitch class (0 = C).
export function questionOf(level: Level, progression: Progression, tonic: number): Question {
  const degrees = degreesOf(progression).map((d) => d!)
  const isMinor = degrees.includes(DEGREES.i!)
  const tonicDegree = isMinor ? DEGREES.i! : DEGREES.I!
  let previous = START_VOICING
  const chordOf = ({ root, triad }: Degree) => {
    const absoluteRoot = tonic + root
    previous = upperVoices(absoluteRoot, triad, previous)
    return [BASS_LOWEST + mod(absoluteRoot - BASS_LOWEST, 12), ...previous]
  }
  const cue = isChordCue(level) ? chordOf(tonicDegree) : [CUE_NOTE_LOWEST + mod(tonic - CUE_NOTE_LOWEST, 12)]
  const key = `${(isMinor ? MINOR_KEYS : MAJOR_KEYS)[tonic]} ${isMinor ? 'minor' : 'major'}`
  return { progression, key, cue, chords: degrees.map(chordOf) }
}

export const randomQuestion = (level: Level) => questionOf(level, randomItem(progressionsOf(level)), Math.floor(Math.random() * 12))
