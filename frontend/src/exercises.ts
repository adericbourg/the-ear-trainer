export type Category = { id: string; name: string }
export type Exercise = { id: string; name: string; categoryId: string }

export const categories: Category[] = []
export const exercises: Exercise[] = []
