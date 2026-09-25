export const SERIES_LENGTH = 10
export type Answer = { readonly label: string; readonly isHit: boolean }
export const hitsOf = (answers: readonly Answer[]) => answers.filter((a) => a.isHit).length
