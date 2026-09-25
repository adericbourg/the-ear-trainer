import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Chords from './Chords'
import { toFrequency, type Level } from '../intervals/interval'
import { playInterval, stopInterval } from '../../../tone'

vi.mock('../../../tone', () => ({ playInterval: vi.fn(), stopInterval: vi.fn() }))

// Math.random() = 0.5 draws F♯ minor (MIDI 66 69 73) in Beginner, and an open F♯7/C♯ in Expert.
function renderExercise(level: Level = 'beginner', isLastQuestion = false, isAutoPlay = false) {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  const onCheck = vi.fn()
  const onNext = vi.fn()
  render(<Chords level={level} isLastQuestion={isLastQuestion} isAutoPlay={isAutoPlay} onCheck={onCheck} onNext={onNext} />)
  return {
    onCheck,
    onNext,
    play: () => screen.getByRole('button', { name: 'Play' }),
    check: () => screen.getByRole('button', { name: 'Check' }),
    triad: (name: string) => within(screen.getByRole('group', { name: 'Triad' })).getByRole('button', { name }),
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

  it('triads_areEnabledOncePlayed', () => {
    // Given a fresh Beginner exercise, focused on the first triad
    const { play, triad, onCheck } = renderExercise()
    expect(screen.queryByRole('group', { name: 'Level' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument()
    expect(triad('major')).toHaveFocus()
    expect(triad('major')).toHaveAttribute('aria-disabled', 'true')

    // When clicking a triad before playing
    fireEvent.click(triad('minor'))

    // Then nothing is submitted
    expect(onCheck).not.toHaveBeenCalled()

    // When clicking Play
    fireEvent.click(play())

    // Then the chord plays one note at a time, bass first, and the triads are enabled
    expect(playInterval).toHaveBeenCalledWith([66, 69, 73].map(toFrequency), false)
    expect(triad('major')).not.toHaveAttribute('aria-disabled', 'true')

    // And Space replays from a triad, but not from another button
    fireEvent.keyDown(triad('major'), { key: ' ' })
    expect(playInterval).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(play(), { key: ' ' })
    expect(playInterval).toHaveBeenCalledTimes(2)
  })

  it('triad_whenHit_locksAnswerAndShowsTheChord', () => {
    // Given a played Beginner chord: only the major and minor triads are asked
    const { play, triad, onCheck } = renderExercise()
    fireEvent.click(play())
    expect(within(screen.getByRole('group', { name: 'Triad' })).getAllByRole('button').map((b) => b.textContent)).toEqual(['major', 'minor'])
    expect(screen.queryByRole('group', { name: 'Extension' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Inversion' })).not.toBeInTheDocument()

    // When clicking minor
    fireEvent.click(triad('minor'))

    // Then it is a hit, with the chord name and notes, and the answer is locked
    expect(screen.getByText(/You guessed right! It was a minor\./)).toBeInTheDocument()
    expect(screen.getByText(/F♯m: F♯ A C♯/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
    expect(triad('minor')).toHaveAttribute('data-result', 'hit')
    expect(triad('major')).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(triad('major'))
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'minor', isHit: true })
  })

  it('next_startsANewRound', () => {
    // Given a checked miss, showing the right triad
    const { play, triad, onCheck, onNext } = renderExercise()
    fireEvent.click(play())
    fireEvent.click(triad('major'))
    expect(screen.getByText(/Wrong triad\. It was a minor\./)).toBeInTheDocument()
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'minor', isHit: false })
    expect(triad('major')).toHaveAttribute('data-result', 'miss')
    expect(triad('minor')).toHaveAttribute('data-result', 'hit')

    // When clicking Next
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Then the series is told, audio stops and the round is reset
    expect(onNext).toHaveBeenCalledOnce()
    expect(stopInterval).toHaveBeenCalled()
    expect(screen.queryByText(/Wrong triad/)).not.toBeInTheDocument()
    expect(triad('major')).toHaveFocus()
    expect(triad('major')).toHaveAttribute('aria-disabled', 'true')
    expect(triad('major')).not.toHaveAttribute('data-result')
    expect(triad('minor')).not.toHaveAttribute('data-result')
  })

  it('intermediate_answersWithOneClick', () => {
    // Given a played Intermediate exercise
    const { play, triad, onCheck } = renderExercise('intermediate')
    fireEvent.click(play())
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument()

    // When clicking augmented
    fireEvent.click(triad('augmented'))

    // Then the answer is submitted
    expect(onCheck).toHaveBeenCalledOnce()
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

  it('autoPlay_playsEachNewQuestion', () => {
    // Given / When an auto-play exercise
    const { triad } = renderExercise('beginner', false, true)

    // Then the chord plays without clicking Play
    expect(playInterval).toHaveBeenCalledExactlyOnceWith([toFrequency(66), toFrequency(69), toFrequency(73)], false)

    // When answering then clicking Next
    fireEvent.click(triad('major'))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Then the new chord plays too
    expect(playInterval).toHaveBeenCalledTimes(2)
  })

  it('next_whenLastQuestion_readsSeeScoreAndKeepsTheRound', () => {
    // Given a checked last question
    const { play, triad, onNext } = renderExercise('beginner', true)
    fireEvent.click(play())
    fireEvent.click(triad('minor'))

    // When clicking See score
    fireEvent.click(screen.getByRole('button', { name: 'See score' }))

    // Then the series is told, and no new round starts
    expect(onNext).toHaveBeenCalledOnce()
    expect(screen.getByText(/You guessed right! It was a minor\./)).toBeInTheDocument()
  })
})
