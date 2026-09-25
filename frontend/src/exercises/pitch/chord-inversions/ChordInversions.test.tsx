import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChordInversions from './ChordInversions'
import { toFrequency, type Level } from '../intervals/interval'
import { playInterval, stopInterval } from '../../../tone'

vi.mock('../../../tone', () => ({ playInterval: vi.fn(), stopInterval: vi.fn() }))

// Math.random() = 0.5 draws F♯m/A (MIDI 69 73 78) in Beginner and Intermediate.
function renderExercise(level: Level = 'beginner', isLastQuestion = false, isAutoPlay = false) {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  const onCheck = vi.fn()
  const onNext = vi.fn()
  render(<ChordInversions level={level} isLastQuestion={isLastQuestion} isAutoPlay={isAutoPlay} onCheck={onCheck} onNext={onNext} />)
  return {
    onCheck,
    onNext,
    play: () => screen.getByRole('button', { name: 'Play' }),
    inversions: () => within(screen.getByRole('group', { name: 'Inversion' })).getAllByRole('button').map((b) => b.lastChild?.textContent),
    inversion: (name: string) => within(screen.getByRole('group', { name: 'Inversion' })).getByRole('button', { name }),
  }
}

describe('ChordInversions', () => {
  beforeEach(() => {
    vi.mocked(playInterval).mockClear()
    vi.mocked(stopInterval).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('beginner_showsTheChordTypeAndEnablesInversionsOncePlayed', () => {
    // Given a fresh Beginner exercise, focused on the first inversion
    const { play, inversion, inversions, onCheck } = renderExercise()
    expect(screen.getByText('It is a minor chord.')).toBeInTheDocument()
    expect(inversions()).toEqual(['root position', '1st inversion', '2nd inversion'])
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument()
    expect(inversion('root position')).toHaveFocus()
    expect(inversion('root position')).toHaveAttribute('aria-disabled', 'true')

    // When clicking an inversion before playing
    fireEvent.click(inversion('1st inversion'))

    // Then nothing is submitted
    expect(onCheck).not.toHaveBeenCalled()

    // When clicking Play
    fireEvent.click(play())

    // Then the chord plays one note at a time, bass first, and the inversions are enabled
    expect(playInterval).toHaveBeenCalledWith([69, 73, 78].map(toFrequency), false)
    expect(inversion('root position')).not.toHaveAttribute('aria-disabled', 'true')

    // And Space replays from an inversion, but not from another button
    fireEvent.keyDown(inversion('root position'), { key: ' ' })
    expect(playInterval).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(play(), { key: ' ' })
    expect(playInterval).toHaveBeenCalledTimes(2)
  })

  it('inversion_whenHit_locksAnswerAndShowsTheChord', () => {
    // Given a played Beginner chord
    const { play, inversion, onCheck } = renderExercise()
    fireEvent.click(play())

    // When pressing a key past the last inversion
    fireEvent.keyDown(document, { key: '4', code: 'Digit4' })

    // Then nothing is submitted
    expect(onCheck).not.toHaveBeenCalled()

    // When pressing the 1st inversion's key
    fireEvent.keyDown(document, { key: '2', code: 'Digit2' })

    // Then it is a hit, with the bass and the chord notes, and the answer is locked
    expect(screen.getByText(/You guessed right! It was the 1st inversion \(3rd in the bass\)\./)).toBeInTheDocument()
    expect(screen.getByText(/F♯m\/A: A C♯ F♯/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
    expect(inversion('1st inversion')).toHaveAttribute('data-result', 'hit')
    expect(inversion('root position')).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(inversion('root position'))
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'minor, 1st inversion', isHit: true })
  })

  it('next_afterAMiss_startsANewRound', () => {
    // Given a checked miss on an Intermediate chord, whose type isn't shown
    const { play, inversion, onCheck, onNext } = renderExercise('intermediate')
    expect(screen.queryByText(/It is a/)).not.toBeInTheDocument()
    fireEvent.click(play())
    fireEvent.click(inversion('root position'))
    expect(screen.getByText(/Missed! It was the 1st inversion \(3rd in the bass\)\./)).toBeInTheDocument()
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'minor, 1st inversion', isHit: false })
    expect(inversion('root position')).toHaveAttribute('data-result', 'miss')
    expect(inversion('1st inversion')).toHaveAttribute('data-result', 'hit')

    // When clicking Next
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Then the series is told, audio stops and the round is reset
    expect(onNext).toHaveBeenCalledOnce()
    expect(stopInterval).toHaveBeenCalled()
    expect(screen.queryByText(/Missed/)).not.toBeInTheDocument()
    expect(inversion('root position')).toHaveFocus()
    expect(inversion('root position')).toHaveAttribute('aria-disabled', 'true')
    expect(inversion('root position')).not.toHaveAttribute('data-result')
    expect(inversion('1st inversion')).not.toHaveAttribute('data-result')
  })

  it('advanced_offersThe3rdInversionEvenForATriad', () => {
    // Given an Advanced major triad (the first random draw picks the chord)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.5)
    render(<ChordInversions level="advanced" isLastQuestion={false} isAutoPlay={false} onCheck={vi.fn()} onNext={vi.fn()} />)

    // Then the chord plays with its notes together, and the 3rd inversion is offered
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(vi.mocked(playInterval).mock.calls[0]![0]).toHaveLength(3)
    expect(vi.mocked(playInterval).mock.calls[0]![1]).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '3rd inversion' }))
    expect(screen.getByText(/Missed! It was the 1st inversion \(3rd in the bass\)\./)).toBeInTheDocument()
  })

  it('autoPlay_playsEachNewQuestion', () => {
    // Given / When an auto-play exercise
    const { inversion } = renderExercise('beginner', false, true)

    // Then the chord plays without clicking Play
    expect(playInterval).toHaveBeenCalledExactlyOnceWith([69, 73, 78].map(toFrequency), false)

    // When answering then clicking Next
    fireEvent.click(inversion('root position'))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Then the new chord plays too
    expect(playInterval).toHaveBeenCalledTimes(2)
  })

  it('next_whenLastQuestion_readsSeeScoreAndKeepsTheRound', () => {
    // Given a checked last question
    const { play, inversion, onNext } = renderExercise('beginner', true)
    fireEvent.click(play())
    fireEvent.click(inversion('1st inversion'))

    // When clicking See score
    fireEvent.click(screen.getByRole('button', { name: 'See score' }))

    // Then the series is told, and no new round starts
    expect(onNext).toHaveBeenCalledOnce()
    expect(screen.getByText(/You guessed right! It was the 1st inversion/)).toBeInTheDocument()
  })
})
