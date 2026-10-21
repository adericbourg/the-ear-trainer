import { beforeEach, describe, expect, it } from 'vitest'
import { ExerciseId } from './exercises'
import {
  clearScores,
  highestMastered,
  loadScores,
  localDate,
  mergeScores,
  mostPracticed,
  parseScores,
  recordSeries,
  saveScores,
  streaks,
  type CompletedSeries,
  type DailyScore,
} from './scores'

const intervals = ExerciseId('intervals')
const panning = ExerciseId('panning')
const score = (date: string, exerciseId: ExerciseId, level: DailyScore['level'], bestHits: number, seriesCount = 1) => ({
  date,
  exerciseId,
  level,
  bestHits,
  seriesCount,
})

describe('scores', () => {
  beforeEach(() => localStorage.clear())

  it('localDate_usesTheLocalCalendarDay', () => {
    // Given / When a late local evening
    // Then it is that local day, zero-padded
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('recordSeries_keepsTheBestHitsAndCountsSeriesPerDayExerciseAndLevel', () => {
    // Given a series recorded once
    const first = recordSeries([], { date: '2026-10-21', exerciseId: intervals, level: 'advanced', hits: 6 })

    // When recording a better then a worse one the same day and level, and one at another level
    const series: CompletedSeries[] = [
      { date: '2026-10-21', exerciseId: intervals, level: 'advanced', hits: 8 },
      { date: '2026-10-21', exerciseId: intervals, level: 'advanced', hits: 5 },
      { date: '2026-10-21', exerciseId: intervals, level: 'beginner', hits: 10 },
    ]
    const scores = series.reduce(recordSeries, first)

    // Then each level keeps its best score and its series count
    expect(scores).toEqual([
      score('2026-10-21', intervals, 'advanced', 8, 3),
      score('2026-10-21', intervals, 'beginner', 10, 1),
    ])
    expect(first).toEqual([score('2026-10-21', intervals, 'advanced', 6, 1)])
  })

  it('mergeScores_keepsTheMaxOfBothAndIsIdempotent', () => {
    // Given current and imported scores overlapping on one day, exercise and level
    const current = [score('2026-10-20', intervals, 'advanced', 8, 1), score('2026-10-21', panning, 'expert', 6, 2)]
    const imported = [score('2026-10-20', intervals, 'advanced', 7, 3), score('2026-10-19', panning, 'beginner', 9)]

    // When merging them, then merging the import again
    const merged = mergeScores(current, imported)

    // Then overlapping entries keep the max of both, others are added, and a second merge changes nothing
    expect(merged).toEqual([
      score('2026-10-20', intervals, 'advanced', 8, 3),
      score('2026-10-21', panning, 'expert', 6, 2),
      score('2026-10-19', panning, 'beginner', 9),
    ])
    expect(mergeScores(merged, imported)).toEqual(merged)
  })

  it('parseScores_dropsInvalidEntries', () => {
    // Given valid entries mixed with invalid ones
    const raw = [
      score('2026-10-21', intervals, 'advanced', 8, 2),
      { ...score('2026-10-21', intervals, 'advanced', 8), exerciseId: 'unknown' },
      { ...score('2026-10-21', intervals, 'advanced', 8), level: 'godlike' },
      score('2026-10-21', intervals, 'advanced', 11),
      score('2026-10-21', intervals, 'advanced', 8, 0),
      score('21/10/2026', intervals, 'advanced', 8),
      null,
    ]

    // When / Then only the valid entry is kept, and non-arrays give nothing
    expect(parseScores(raw)).toEqual([score('2026-10-21', intervals, 'advanced', 8, 2)])
    expect(parseScores({ scores: [] })).toBeUndefined()
  })

  it('saveScores_roundTripsThroughLocalStorage', () => {
    // Given no stored scores
    expect(loadScores()).toEqual([])

    // When saving some
    const scores = [score('2026-10-21', panning, 'expert', 6)]
    saveScores(scores)

    // Then they load back, and clearing removes them
    expect(loadScores()).toEqual(scores)
    clearScores()
    expect(loadScores()).toEqual([])

    // And corrupted storage loads as empty
    localStorage.setItem('the-ear-trainer.scores', '{not json')
    expect(loadScores()).toEqual([])
  })

  it('streaks_countsConsecutiveDays', () => {
    // Given practice on 15, 16, 17 then 19, 20 October
    const scores = ['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-19', '2026-10-20'].map((date) =>
      score(date, intervals, 'beginner', 5),
    )

    // When / Then the current streak still counts on the next day, and breaks after a missed day
    expect(streaks(scores, '2026-10-20')).toEqual({ current: 2, longest: 3 })
    expect(streaks(scores, '2026-10-21')).toEqual({ current: 2, longest: 3 })
    expect(streaks(scores, '2026-10-22')).toEqual({ current: 0, longest: 3 })
    expect(streaks([], '2026-10-22')).toEqual({ current: 0, longest: 0 })
  })

  it('mostPracticed_sumsSeriesOfTheMonthOnly', () => {
    // Given panning practiced more in September, intervals more in October
    const scores = [
      score('2026-09-30', panning, 'beginner', 5, 9),
      score('2026-10-01', panning, 'beginner', 5, 2),
      score('2026-10-02', intervals, 'beginner', 5, 2),
      score('2026-10-02', intervals, 'expert', 5, 1),
    ]

    // When / Then October's most practiced is intervals, none in November
    expect(mostPracticed(scores, '2026-10')).toEqual({ exerciseId: intervals, seriesCount: 3 })
    expect(mostPracticed(scores, '2026-11')).toBeUndefined()
  })

  it('highestMastered_isTheHighestLevelWithNineOrMore', () => {
    // Given 9/10 at intermediate and 8/10 at expert
    const scores = [
      score('2026-10-01', intervals, 'intermediate', 9),
      score('2026-10-02', intervals, 'expert', 8),
      score('2026-10-02', panning, 'beginner', 8),
    ]

    // When / Then intervals is mastered at intermediate, panning not at all
    expect(highestMastered(scores, intervals)).toBe('intermediate')
    expect(highestMastered(scores, panning)).toBeUndefined()
  })
})
