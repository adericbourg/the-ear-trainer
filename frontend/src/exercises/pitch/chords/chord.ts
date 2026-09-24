import { isExpert, LEVELS, type Level } from '../intervals/interval'

export type Triad = 'major' | 'minor' | 'diminished' | 'augmented' | 'sus2' | 'sus4'
export type Extension = 'none' | '7' | 'maj7' | 'add9'
export type Chord = { readonly name: string; readonly symbol: string; readonly triad: Triad; readonly extension: Extension }
export type Answer = { readonly triad: Triad; readonly extension: Extension; readonly inversion: number }

export const TRIADS: readonly Triad[] = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4']
export const EXTENSIONS: readonly Extension[] = ['none', '7', 'maj7', 'add9']
export const INVERSIONS = ['root position', '1st', '2nd', '3rd']

// A tone is a chord note above the root: letters (a third is 2 letters above the root) and semitones.
type Tone = { readonly steps: number; readonly semitones: number }
const tone = (steps: number, semitones: number): Tone => ({ steps, semitones })

const TRIAD_TONES: Record<Triad, readonly Tone[]> = {
  major: [tone(0, 0), tone(2, 4), tone(4, 7)],
  minor: [tone(0, 0), tone(2, 3), tone(4, 7)],
  diminished: [tone(0, 0), tone(2, 3), tone(4, 6)],
  augmented: [tone(0, 0), tone(2, 4), tone(4, 8)],
  sus2: [tone(0, 0), tone(1, 2), tone(4, 7)],
  sus4: [tone(0, 0), tone(3, 5), tone(4, 7)],
}
// The 9th is voiced above the 5th, not as a 2nd (which would be a cluster).
const EXTENSION_TONES: Record<Extension, readonly Tone[]> = {
  none: [],
  '7': [tone(6, 10)],
  maj7: [tone(6, 11)],
  add9: [tone(8, 14)],
}

const CHORDS: readonly (Chord & { readonly since: Level })[] = [
  { name: 'major', symbol: '', triad: 'major', extension: 'none', since: 'beginner' },
  { name: 'minor', symbol: 'm', triad: 'minor', extension: 'none', since: 'beginner' },
  { name: 'diminished', symbol: 'dim', triad: 'diminished', extension: 'none', since: 'intermediate' },
  { name: 'augmented', symbol: 'aug', triad: 'augmented', extension: 'none', since: 'intermediate' },
  { name: 'maj7', symbol: 'maj7', triad: 'major', extension: 'maj7', since: 'advanced' },
  { name: 'dominant 7', symbol: '7', triad: 'major', extension: '7', since: 'advanced' },
  { name: 'm7', symbol: 'm7', triad: 'minor', extension: '7', since: 'advanced' },
  { name: 'm7♭5', symbol: 'm7♭5', triad: 'diminished', extension: '7', since: 'expert' },
  { name: 'sus2', symbol: 'sus2', triad: 'sus2', extension: 'none', since: 'expert' },
  { name: 'sus4', symbol: 'sus4', triad: 'sus4', extension: 'none', since: 'expert' },
  { name: 'add9', symbol: 'add9', triad: 'major', extension: 'add9', since: 'expert' },
]

const rank = (level: Level) => LEVELS.findIndex((l) => l.level === level)

export const chordsOf = (level: Level): readonly Chord[] => CHORDS.filter((c) => rank(c.since) <= rank(level))
export const triadsOf = (level: Level) => TRIADS.filter((t) => chordsOf(level).some((c) => c.triad === t))
export const extensionsOf = (level: Level) => EXTENSIONS.filter((e) => chordsOf(level).some((c) => c.extension === e))

// Their inversions are ambiguous: an inverted augmented triad is another augmented triad, an inverted sus4 a sus2.
const isRootPositionOnly = (triad: Triad | undefined) => triad === 'augmented' || triad === 'sus2' || triad === 'sus4'

// The 3rd inversion puts the 7th in the bass; the 9th is never in the bass.
export const inversionCountOf = (triad: Triad | undefined, extension: Extension) =>
  isRootPositionOnly(triad) ? 1 : extension === '7' || extension === 'maj7' ? 4 : 3

const bySemitones = (a: Tone, b: Tone) => a.semitones - b.semitones
const raised = (t: Tone): Tone => ({ ...t, semitones: t.semitones + 12 })

// Tones from the bass up. Inverting raises the lowest tones by an octave; opening also raises the second lowest.
export function voicing({ triad, extension }: Chord, inversion: number, isOpen: boolean) {
  const close = [...TRIAD_TONES[triad], ...EXTENSION_TONES[extension]]
    .map((t, i) => (i < inversion ? raised(t) : t))
    .sort(bySemitones)
  return isOpen ? close.map((t, i) => (i === 1 ? raised(t) : t)).sort(bySemitones) : close
}

const LETTERS = 'CDEFGAB'
const NATURALS = [0, 2, 4, 5, 7, 9, 11]
const ACCIDENTALS: Record<number, string> = { [-2]: '♭♭', [-1]: '♭', 0: '', 1: '♯', 2: '♯♯' }
const ROOTS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']

const mod = (n: number, m: number) => ((n % m) + m) % m
const pitchClassOf = (root: string) => mod(NATURALS[LETTERS.indexOf(root[0]!)]! + (root.includes('♯') ? 1 : 0) - (root.includes('♭') ? 1 : 0), 12)

// Spelled from the theory: the letter comes from the steps, the accidental makes up the semitones.
function spell(root: string, { steps, semitones }: Tone) {
  const letter = mod(LETTERS.indexOf(root[0]!) + steps, 7)
  const accidental = mod(pitchClassOf(root) + semitones - NATURALS[letter]! + 6, 12) - 6
  return LETTERS[letter]! + ACCIDENTALS[accidental]
}

export function labelOf(root: string, chord: Chord, tones: readonly Tone[]) {
  const notes = tones.map((t) => spell(root, t))
  const bass = notes[0] === root ? '' : `/${notes[0]}`
  return `${root}${chord.symbol}${bass}: ${notes.join(' ')}`
}

const randomItem = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]!

const HIGHEST_NOTE = 84 // C6
const lowestNote = (level: Level) => (isExpert(level) ? 36 : 48) // C2 or C3

export type Question = { readonly chord: Chord; readonly inversion: number; readonly notes: readonly number[]; readonly label: string }

// Notes are MIDI numbers, bass first.
export function randomQuestion(level: Level): Question {
  const chord = randomItem(chordsOf(level))
  const inversion = isExpert(level) ? Math.floor(Math.random() * inversionCountOf(chord.triad, chord.extension)) : 0
  const tones = voicing(chord, inversion, isExpert(level))
  const root = randomItem(ROOTS)
  const low = lowestNote(level)
  const lowestRoot = low + mod(pitchClassOf(root) - low, 12)
  const octaves = Math.floor((HIGHEST_NOTE - tones.at(-1)!.semitones - lowestRoot) / 12)
  const rootNote = lowestRoot + 12 * Math.floor(Math.random() * (octaves + 1))
  return { chord, inversion, notes: tones.map((t) => rootNote + t.semitones), label: labelOf(root, chord, tones) }
}

const join = (words: readonly string[]) => words.join(' and ')
const INVERSION_NAMES = ['root position', '1st inversion', '2nd inversion', '3rd inversion']

// Only the groups shown in the level are graded; the inversion isn't asked for root-position-only chords.
export function feedback(level: Level, { chord, inversion }: Question, answer: Answer) {
  const isInversionAsked = isExpert(level) && !isRootPositionOnly(chord.triad)
  const groups: [string, boolean][] = [['triad', answer.triad === chord.triad]]
  if (extensionsOf(level).length > 1) groups.push(['extension', answer.extension === chord.extension])
  if (isInversionAsked) groups.push(['inversion', answer.inversion === inversion])

  const article = /^[aeiou]/.test(chord.name) ? 'an' : 'a'
  const parts = chord.extension === 'none' ? '' : ` (${chord.triad} + ${chord.extension})`
  const inverted = isInversionAsked ? `, ${INVERSION_NAMES[inversion]}` : ''
  const target = `It was ${article} ${chord.name}${parts}${inverted}.`

  const wrong = groups.filter(([, isRight]) => !isRight).map(([name]) => name)
  if (wrong.length === 0) return { isHit: true, text: `You guessed right! ${target}` }
  const right = groups.filter(([, isRight]) => isRight).map(([name]) => name)
  const rightNames = right.length === 2 && wrong[0] === 'inversion' ? ['chord'] : right
  const reason = right.length === 0 ? `Wrong ${join(wrong)}` : `Right ${join(rightNames)}, wrong ${join(wrong)}`
  return { isHit: false, text: `${reason}. ${target}` }
}
