import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExerciseId } from './exercises'
import { loadScores, saveScores, type DailyScore } from './scores'
import Scoreboard from './Scoreboard'

const scores: DailyScore[] = [
  { date: '2026-10-20', exerciseId: ExerciseId('intervals'), level: 'intermediate', bestHits: 9, seriesCount: 1 },
  { date: '2026-10-21', exerciseId: ExerciseId('intervals'), level: 'advanced', bestHits: 8, seriesCount: 3 },
  { date: '2026-10-21', exerciseId: ExerciseId('chord-types'), level: 'beginner', bestHits: 10, seriesCount: 1 },
]

describe('Scoreboard', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 21, 12))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('render_withoutScores_showsThePrivacyNoticeAndAnEmptyState', () => {
    // Given / When no scores
    render(<Scoreboard />)

    // Then the privacy notice and the empty state are shown
    expect(screen.getByRole('heading', { level: 1, name: 'Scores' })).toBeInTheDocument()
    expect(screen.getByText(/Your scores stay in this browser/)).toHaveTextContent(/We don't collect any data/)
    expect(screen.getByText(/lost if you clear this site's data/)).toBeInTheDocument()
    expect(screen.getByText('No scores yet. Complete a scored series to see it here.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear my scores' })).not.toBeInTheDocument()
  })

  it('render_withScores_showsStatsAndHistoryByDay', () => {
    // Given scores on two days
    saveScores(scores)

    // When rendered
    render(<Scoreboard />)

    // Then the stats are shown
    expect(screen.getByText('Day streak').nextElementSibling).toHaveTextContent('2 days (longest: 2)')
    expect(screen.getByText('Most practiced this month').nextElementSibling).toHaveTextContent('Intervals (4 series)')
    const mastered = within(screen.getByRole('table', { name: 'Highest level mastered' }))
    expect(mastered.getByRole('row', { name: /Intervals/ })).toHaveTextContent('Intermediate')
    expect(mastered.getByRole('row', { name: /Panning/ })).toHaveTextContent('–')

    // And the history, most recent day first, exercises in registry order with their level badge
    const days = screen.getAllByRole('heading', { level: 3 })
    expect(days.map((d) => d.textContent)).toEqual([expect.stringMatching(/21/), expect.stringMatching(/20/)])
    const today = within(days[0]!.nextElementSibling as HTMLElement).getAllByRole('listitem')
    expect(today.map((item) => item.textContent)).toEqual(['Intervals8/10Advanced', 'Chord types10/10Beginner'])
  })

  it('clearButton_afterConfirmation_removesTheScores', () => {
    // Given scores, and a confirmation first refused then accepted
    saveScores(scores)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    render(<Scoreboard />)

    // When clicking Clear and refusing
    fireEvent.click(screen.getByRole('button', { name: 'Clear my scores' }))

    // Then nothing changes
    expect(loadScores()).toEqual(scores)

    // When clicking Clear and accepting
    fireEvent.click(screen.getByRole('button', { name: 'Clear my scores' }))

    // Then the scores are gone
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(loadScores()).toEqual([])
    expect(screen.getByText('No scores yet. Complete a scored series to see it here.')).toBeInTheDocument()
  })

  it('exportLink_downloadsTheScoresAsJson', () => {
    // Given scores
    saveScores(scores)

    // When rendered
    render(<Scoreboard />)

    // Then the export link holds them as a dated JSON file
    const link = screen.getByRole('link', { name: 'Export' })
    expect(link).toHaveAttribute('download', 'ear-trainer-scores-2026-10-21.json')
    expect(JSON.parse(decodeURIComponent(link.getAttribute('href')!.split(',')[1]!))).toEqual(scores)
  })

  it('importInput_replacesTheScoresOrRejectsInvalidFiles', async () => {
    // Given no scores, and confirmations accepted
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Scoreboard />)
    const input = screen.getByLabelText('Import scores file')

    // When importing an invalid file
    fireEvent.change(input, { target: { files: [new File(['not json'], 'x.json')] } })

    // Then it is rejected
    expect(await screen.findByRole('alert')).toHaveTextContent("This file isn't a scores export.")

    // When importing an export
    fireEvent.change(input, { target: { files: [new File([JSON.stringify(scores)], 'x.json')] } })

    // Then the scores are replaced
    expect(await screen.findByText('Most practiced this month')).toBeInTheDocument()
    expect(loadScores()).toEqual(scores)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
