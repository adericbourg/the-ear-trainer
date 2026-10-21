import { exercises, type ExerciseId } from './exercises'
import { LEVELS, type Level } from './exercises/pitch/intervals/interval'
import { SERIES_LENGTH } from './exercises/scoring'

// Best score of a day for one exercise at one level, and how many series it took.
export type DailyScore = {
  readonly date: string
  readonly exerciseId: ExerciseId
  readonly level: Level
  readonly bestHits: number
  readonly seriesCount: number
}
export type CompletedSeries = {
  readonly date: string
  readonly exerciseId: ExerciseId
  readonly level: Level
  readonly hits: number
}

const STORAGE_KEY = 'the-ear-trainer.scores'
const MASTERY_HITS = SERIES_LENGTH - 1
const DAY_MS = 24 * 60 * 60 * 1000

export const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function recordSeries(scores: readonly DailyScore[], { date, exerciseId, level, hits }: CompletedSeries) {
  const isSame = (s: DailyScore) => s.date === date && s.exerciseId === exerciseId && s.level === level
  const existing = scores.find(isSame)
  if (!existing) return [...scores, { date, exerciseId, level, bestHits: hits, seriesCount: 1 }]
  return scores.map((s) =>
    isSame(s) ? { ...s, bestHits: Math.max(s.bestHits, hits), seriesCount: s.seriesCount + 1 } : s,
  )
}

const isCount = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max

// Stored and imported scores are external input: ids are resolved against the registry, never cast.
export function parseScores(raw: unknown): readonly DailyScore[] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw.flatMap((entry: Partial<Record<keyof DailyScore, unknown>> | null) => {
    const exerciseId = exercises.find((e) => e.id === entry?.exerciseId)?.id
    const level = LEVELS.find((l) => l.level === entry?.level)?.level
    if (!entry || !exerciseId || !level) return []
    if (typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return []
    if (!isCount(entry.bestHits, 0, SERIES_LENGTH) || !isCount(entry.seriesCount, 1, Number.MAX_SAFE_INTEGER)) return []
    return [{ date: entry.date, exerciseId, level, bestHits: entry.bestHits as number, seriesCount: entry.seriesCount as number }]
  })
}

// localStorage throws when blocked (some private modes, disabled site data): scores then just aren't kept.
export function isStorageAvailable() {
  try {
    localStorage.setItem(`${STORAGE_KEY}.probe`, '')
    localStorage.removeItem(`${STORAGE_KEY}.probe`)
    return true
  } catch {
    return false
  }
}

export function loadScores(): readonly DailyScore[] {
  try {
    return parseScores(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')) ?? []
  } catch {
    return []
  }
}

export function saveScores(scores: readonly DailyScore[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores))
  } catch {
    // Storage unavailable: the Scores page tells the user.
  }
}

export function clearScores() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS

// The current streak survives until the end of the day after the last practice.
export function streaks(scores: readonly DailyScore[], today: string) {
  const days = [...new Set(scores.map((s) => dayNumber(s.date)))].sort((a, b) => a - b)
  let longest = 0
  let run = 0
  days.forEach((day, i) => {
    run = i > 0 && day - days[i - 1]! === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  })
  const last = days.at(-1)
  const isAlive = last !== undefined && dayNumber(today) - last <= 1
  return { current: isAlive ? run : 0, longest }
}

// month: 'YYYY-MM'. Ties go to the first exercise in the registry.
export function mostPracticed(scores: readonly DailyScore[], month: string) {
  let best: { exerciseId: ExerciseId; seriesCount: number } | undefined
  for (const { id } of exercises) {
    const seriesCount = scores
      .filter((s) => s.exerciseId === id && s.date.startsWith(`${month}-`))
      .reduce((sum, s) => sum + s.seriesCount, 0)
    if (seriesCount > 0 && seriesCount > (best?.seriesCount ?? 0)) best = { exerciseId: id, seriesCount }
  }
  return best
}

export const highestMastered = (scores: readonly DailyScore[], exerciseId: ExerciseId) =>
  LEVELS.findLast(({ level }) =>
    scores.some((s) => s.exerciseId === exerciseId && s.level === level && s.bestHits >= MASTERY_HITS),
  )?.level
