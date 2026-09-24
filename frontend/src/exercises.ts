type Brand<T, B extends string> = T & { readonly __brand: B }

export type CategoryId = Brand<string, 'CategoryId'>
export const CategoryId = (value: string) => value as CategoryId
export type ExerciseId = Brand<string, 'ExerciseId'>
export const ExerciseId = (value: string) => value as ExerciseId

export type Category = { readonly id: CategoryId; readonly name: string }
export type Exercise = { readonly id: ExerciseId; readonly name: string; readonly categoryId: CategoryId }

export const categories: readonly Category[] = [{ id: CategoryId('sound-engineering'), name: 'Sound engineering' }]
export const exercises: readonly Exercise[] = [
  {
    id: ExerciseId('frequency-identification'),
    name: 'Frequency identification',
    categoryId: CategoryId('sound-engineering'),
  },
]
