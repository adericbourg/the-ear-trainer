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
  { id: CategoryId('sound-engineering'), name: 'Sound engineering' },
]
export const exercises: readonly Exercise[] = [
  {
    id: ExerciseId('intervals'),
    name: 'Intervals',
    description: 'Recognize the interval between two notes.',
    categoryId: CategoryId('pitch'),
  },
  {
    id: ExerciseId('chords'),
    name: 'Chords',
    description: "Recognize a chord's quality, extensions and inversion.",
    categoryId: CategoryId('pitch'),
  },
  {
    id: ExerciseId('frequency-identification'),
    name: 'Frequency identification',
    description: 'Guess the frequency of a pure tone.',
    categoryId: CategoryId('sound-engineering'),
  },
  {
    id: ExerciseId('panning'),
    name: 'Panning',
    description: 'Locate a sound between left and right. Headphones required.',
    categoryId: CategoryId('sound-engineering'),
  },
]
