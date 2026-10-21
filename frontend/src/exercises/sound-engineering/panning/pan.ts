import { randomItem, toFrequency, type Level } from '../../pitch/intervals/interval'
import { randomQuestion } from '../../harmony/chord-progressions/progression'
import vocalsUrl from '../feedback-suppression/vocals.mp3'
import type { PanSound } from '../../../tone'

// -100 = hard left, 0 = center, 100 = hard right.
export const PAN_MIN = -100
export const PAN_MAX = 100
// Even selector widths keep the bounds integers.
const HALF_WIDTH: Record<Level, number> = { beginner: 25, intermediate: 15, advanced: 10, expert: 6 }
const halfWidthOf = (level: Level) => HALF_WIDTH[level]
export const centerMinOf = (level: Level) => PAN_MIN + halfWidthOf(level)
export const centerMaxOf = (level: Level) => PAN_MAX - halfWidthOf(level)
export const INITIAL_CENTER = 0
export const ARROW_STEP = 1
export const PAGE_STEP = 10

export const formatPan = (pan: number) => (pan === 0 ? 'C' : pan < 0 ? `L${-pan}` : `R${pan}`)

export const toPosition = (pan: number) => (pan - PAN_MIN) / (PAN_MAX - PAN_MIN)
export const toPan = (position: number) => Math.round(position * (PAN_MAX - PAN_MIN) + PAN_MIN)

// MIDI numbers: A3 to A5.
const LOWEST_NOTE = 57
const HIGHEST_NOTE = 81
const randomNote = () => toFrequency(LOWEST_NOTE + Math.floor(Math.random() * (HIGHEST_NOTE - LOWEST_NOTE + 1)))

const SOUNDS: readonly (() => PanSound)[] = [
  () => ({ kind: 'noise' }),
  () => ({ kind: 'tone', frequency: randomNote() }),
  () => ({ kind: 'pulses', frequency: randomNote() }),
  () => ({ kind: 'chords', chords: randomQuestion('advanced').chords.map((chord) => chord.map(toFrequency)) }),
  () => ({ kind: 'sample', url: vocalsUrl }),
]

export const randomSound = () => randomItem(SOUNDS)()

const SUBJECTS: Record<PanSound['kind'], string> = {
  noise: 'The pink noise was',
  tone: 'The tone was',
  pulses: 'The pulsed tone was',
  chords: 'The piano chords were',
  sample: 'The vocals were',
}

export const subjectOf = (sound: PanSound) => SUBJECTS[sound.kind]

export type Target = { readonly pan: number; readonly sound: PanSound }

export const randomTarget = (): Target => ({ pan: PAN_MIN + Math.floor(Math.random() * (PAN_MAX - PAN_MIN + 1)), sound: randomSound() })

export const bounds = (level: Level, center: number) => ({ low: center - halfWidthOf(level), high: center + halfWidthOf(level) })
