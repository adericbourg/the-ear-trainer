import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Chords from './Chords'
import { toFrequency, type Level } from '../intervals/interval'
import { playInterval, stopInterval } from '../../../tone'

vi.mock('../../../tone', () => ({ playInterval: vi.fn(), stopInterval: vi.fn() }))

// Math.random() = 0.5 draws F♯ minor (MIDI 66 69 73) in Beginner, and an open F♯7/C♯ in Expert.
function renderExercise(level: Level = 'beginner', isLastQuestion = false) {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  const onCheck = vi.fn()
  const onNext = vi.fn()
  render(<Chords level={level} isLastQuestion={isLastQuestion} onCheck={onCheck} onNext={onNext} />)
  return {
    onCheck,
    onNext,
    play: () => screen.getByRole('button', { name: 'Play' }),
    check: () => screen.getByRole('button', { name: 'Check' }),
  }
}

describe('Chords', () => {
  beforeEach(() => {
    vi.mocked(playInterval).mockClear()
    vi.mocked(stopInterval).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('check_isEnabledOncePlayed', () => {
    // Given a fresh Beginner exercise, focused on the first triad
    const { play, check } = renderExercise()
    expect(screen.queryByRole('group', { name: 'Level' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'major' })).toHaveFocus()
    expect(check()).toBeDisabled()

    // When clicking Play
    fireEvent.click(play())

    // Then the chord plays one note at a time, bass first, and Check is enabled once a triad is picked
    expect(playInterval).toHaveBeenCalledWith([66, 69, 73].map(toFrequency), false)
    expect(check()).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: 'major' }))
    expect(check()).toBeEnabled()

    // And Space replays from a radio, but not from a button
    fireEvent.keyDown(screen.getByRole('radio', { name: 'major' }), { key: ' ' })
    expect(playInterval).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(play(), { key: ' ' })
    expect(playInterval).toHaveBeenCalledTimes(2)
  })

  it('check_whenHitOnEnter_locksAnswerAndShowsTheChord', () => {
    // Given a played Beginner chord: only the major and minor triads are asked
    const { play, onCheck } = renderExercise()
    fireEvent.click(play())
    expect(screen.getByRole('group', { name: 'Triad' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio', { name: /^(major|minor)$/ })).toHaveLength(2)
    expect(screen.queryByRole('group', { name: 'Extension' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Inversion' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('radio', { checked: true })).toEqual([])

    // When answering minor and pressing Enter
    const minor = screen.getByRole('radio', { name: 'minor' })
    fireEvent.click(minor)
    fireEvent.keyDown(minor, { key: 'Enter' })

    // Then it is a hit, with the chord name and notes, and the answer is locked
    expect(screen.getByText(/You guessed right! It was a minor\./)).toBeInTheDocument()
    expect(screen.getByText(/F♯m: F♯ A C♯/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
    expect(minor).toBeDisabled()
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'minor', isHit: true })
  })

  it('next_startsANewRound', () => {
    // Given a checked miss
    const { play, check, onCheck, onNext } = renderExercise()
    fireEvent.click(play())
    fireEvent.click(screen.getByRole('radio', { name: 'major' }))
    fireEvent.click(check())
    expect(screen.getByText(/Wrong triad\. It was a minor\./)).toBeInTheDocument()
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'minor', isHit: false })

    // When clicking Next
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Then the series is told, audio stops and the round is reset
    expect(onNext).toHaveBeenCalledOnce()
    expect(stopInterval).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
    expect(screen.queryByText(/Wrong triad/)).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'major' })).toHaveFocus()
    expect(screen.getByRole('radio', { name: 'major' })).toBeEnabled()
    expect(screen.getByRole('radio', { name: 'major' })).not.toBeChecked()
  })

  it('expert_asksExtensionAndInversion', () => {
    // Given an Expert exercise
    const { play, check, onCheck } = renderExercise('expert')
    expect(screen.getByRole('radio', { name: 'sus4' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'add9' })).toBeInTheDocument()

    // Then the 3rd inversion is only available for 7th chords
    const third = screen.getByRole('radio', { name: '3rd' })
    expect(third).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: '7' }))
    expect(third).toBeEnabled()
    fireEvent.click(third)
    fireEvent.click(screen.getByRole('radio', { name: 'none' }))
    expect(screen.getByRole('radio', { name: 'root position' })).toBeChecked()

    // And the inversion isn't asked for root-position-only chords
    fireEvent.click(screen.getByRole('radio', { name: 'augmented' }))
    expect(screen.getByRole('radio', { name: '1st' })).toBeDisabled()

    // When answering a major + 7, 2nd inversion to a played open F♯7/C♯
    fireEvent.click(play())
    expect(playInterval).toHaveBeenCalledWith([61, 66, 70, 76].map(toFrequency), true)
    fireEvent.click(screen.getByRole('radio', { name: 'major' }))
    fireEvent.click(screen.getByRole('radio', { name: '7' }))
    fireEvent.click(screen.getByRole('radio', { name: '2nd' }))
    fireEvent.click(check())

    // Then it is a hit
    expect(screen.getByText(/You guessed right! It was a dominant 7 \(major \+ 7\), 2nd inversion\./)).toBeInTheDocument()
    expect(screen.getByText(/F♯7\/C♯: C♯ F♯ A♯ E/)).toBeInTheDocument()
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'dominant 7 (major + 7), 2nd inversion', isHit: true })
  })

  it('next_whenLastQuestion_readsSeeScoreAndKeepsTheRound', () => {
    // Given a checked last question
    const { play, check, onNext } = renderExercise('beginner', true)
    fireEvent.click(play())
    fireEvent.click(screen.getByRole('radio', { name: 'minor' }))
    fireEvent.click(check())

    // When clicking See score
    fireEvent.click(screen.getByRole('button', { name: 'See score' }))

    // Then the series is told, and no new round starts
    expect(onNext).toHaveBeenCalledOnce()
    expect(screen.getByText(/You guessed right! It was a minor\./)).toBeInTheDocument()
  })
})
