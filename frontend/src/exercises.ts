import type { ComponentType } from 'react'
import ChordInversions from './exercises/harmony/chord-inversions/ChordInversions'
import ChordTypes from './exercises/harmony/chord-types/ChordTypes'
import Intervals from './exercises/pitch/intervals/Intervals'
import FeedbackSuppression from './exercises/sound-engineering/feedback-suppression/FeedbackSuppression'
import FrequencyIdentification from './exercises/sound-engineering/frequency-identification/FrequencyIdentification'
import Panning from './exercises/sound-engineering/panning/Panning'
import type { ExerciseProps } from './exercises/Series'

type Brand<T, B extends string> = T & { readonly __brand: B }

export type CategoryId = Brand<string, 'CategoryId'>
export const CategoryId = (value: string) => value as CategoryId
export type ExerciseId = Brand<string, 'ExerciseId'>
export const ExerciseId = (value: string) => value as ExerciseId

export type Category = { readonly id: CategoryId; readonly name: string }
export type Exercise = {
  readonly id: ExerciseId
  readonly name: string
  readonly description: string
  readonly categoryId: CategoryId
}

export const categories: readonly Category[] = [
  { id: CategoryId('pitch'), name: 'Pitch' },
  { id: CategoryId('harmony'), name: 'Harmony' },
  { id: CategoryId('sound-engineering'), name: 'Sound engineering' },
]
export const exercises: readonly (Exercise & { readonly component: ComponentType<ExerciseProps> })[] = [
  {
    id: ExerciseId('intervals'),
    name: 'Intervals',
    description: 'Recognize the interval between two notes.',
    categoryId: CategoryId('pitch'),
    component: Intervals,
  },
  {
    id: ExerciseId('chord-types'),
    name: 'Chord types',
    description: "Recognize a chord's type: major, minor, seventh chords and more.",
    categoryId: CategoryId('harmony'),
    component: ChordTypes,
  },
  {
    id: ExerciseId('chord-inversions'),
    name: 'Chord inversions',
    description: 'Recognize which note of a chord is in the bass.',
    categoryId: CategoryId('harmony'),
    component: ChordInversions,
  },
  {
    id: ExerciseId('frequency-identification'),
    name: 'Frequency identification',
    description: 'Guess the frequency of a pure tone.',
    categoryId: CategoryId('sound-engineering'),
    component: FrequencyIdentification,
  },
  {
    id: ExerciseId('panning'),
    name: 'Panning',
    description: 'Locate a sound between left and right. Headphones required.',
    categoryId: CategoryId('sound-engineering'),
    component: Panning,
  },
  {
    id: ExerciseId('feedback-suppression'),
    name: 'Feedback suppression',
    description: 'Make feedback disappear with a channel EQ.',
    categoryId: CategoryId('sound-engineering'),
    component: FeedbackSuppression,
  },
]
