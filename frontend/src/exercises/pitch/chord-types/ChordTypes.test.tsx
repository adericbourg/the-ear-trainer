import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChordTypes from './ChordTypes'
import { toFrequency, type Level } from '../intervals/interval'
import { playInterval, stopInterval } from '../../../tone'

vi.mock('../../../tone', () => ({ playInterval: vi.fn(), stopInterval: vi.fn() }))

// Math.random() = 0.5 draws F♯ minor (MIDI 66 69 73) in Beginner, and an open F♯7/C♯ in Expert.
function renderExercise(level: Level = 'beginner', isLastQuestion = false, isAutoPlay = false) {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  const onCheck = vi.fn()
  const onNext = vi.fn()
  render(<ChordTypes level={level} isLastQuestion={isLastQuestion} isAutoPlay={isAutoPlay} onCheck={onCheck} onNext={onNext} />)
  return {
    onCheck,
    onNext,
    play: () => screen.getByRole('button', { name: 'Play' }),
    check: () => screen.getByRole('button', { name: 'Check' }),
    type: (name: string) => within(screen.getByRole('group', { name: 'Chord type' })).getByRole('button', { name }),
    types: () => within(screen.getByRole('group', { name: 'Chord type' })).getAllByRole('button').map((b) => b.textContent),
  }
}

describe('ChordTypes', () => {
  beforeEach(() => {
    vi.mocked(playInterval).mockClear()
    vi.mocked(stopInterval).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('types_areEnabledOncePlayed', () => {
    // Given a fresh Beginner exercise, focused on the first type
    const { play, type, onCheck } = renderExercise()
    expect(screen.queryByRole('group', { name: 'Level' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument()
    expect(type('major')).toHaveFocus()
    expect(type('major')).toHaveAttribute('aria-disabled', 'true')

    // When clicking a type before playing
    fireEvent.click(type('minor'))

    // Then nothing is submitted
    expect(onCheck).not.toHaveBeenCalled()

    // When clicking Play
    fireEvent.click(play())

    // Then the chord plays one note at a time, bass first, and the types are enabled
    expect(playInterval).toHaveBeenCalledWith([66, 69, 73].map(toFrequency), false)
    expect(type('major')).not.toHaveAttribute('aria-disabled', 'true')

    // And Space replays from a type, but not from another button
    fireEvent.keyDown(type('major'), { key: ' ' })
    expect(playInterval).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(play(), { key: ' ' })
    expect(playInterval).toHaveBeenCalledTimes(2)
  })

  it('type_whenHit_locksAnswerAndShowsTheChord', () => {
    // Given a played Beginner chord: only major and minor are offered
    const { play, type, types, onCheck } = renderExercise()
    fireEvent.click(play())
    expect(types()).toEqual(['major', 'minor'])

    // When clicking minor
    fireEvent.click(type('minor'))

    // Then it is a hit, with the chord name and notes, and the answer is locked
    expect(screen.getByText(/You guessed right! It was a minor\./)).toBeInTheDocument()
    expect(screen.getByText(/F♯m: F♯ A C♯/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
    expect(type('minor')).toHaveAttribute('data-result', 'hit')
    expect(type('major')).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(type('major'))
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'minor', isHit: true })
  })

  it('next_startsANewRound', () => {
    // Given a checked miss, showing the right type
    const { play, type, onCheck, onNext } = renderExercise()
    fireEvent.click(play())
    fireEvent.click(type('major'))
    expect(screen.getByText(/Missed! It was a minor\./)).toBeInTheDocument()
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'minor', isHit: false })
    expect(type('major')).toHaveAttribute('data-result', 'miss')
    expect(type('minor')).toHaveAttribute('data-result', 'hit')

    // When clicking Next
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Then the series is told, audio stops and the round is reset
    expect(onNext).toHaveBeenCalledOnce()
    expect(stopInterval).toHaveBeenCalled()
    expect(screen.queryByText(/Missed/)).not.toBeInTheDocument()
    expect(type('major')).toHaveFocus()
    expect(type('major')).toHaveAttribute('aria-disabled', 'true')
    expect(type('major')).not.toHaveAttribute('data-result')
    expect(type('minor')).not.toHaveAttribute('data-result')
  })

  it('intermediate_answersWithOneClick', () => {
    // Given a played Intermediate exercise
    const { play, type, onCheck } = renderExercise('intermediate')
    fireEvent.click(play())
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument()

    // When clicking augmented
    fireEvent.click(type('augmented'))

    // Then the answer is submitted
    expect(onCheck).toHaveBeenCalledOnce()
  })

  it('expert_offers5TypesAndNamesTheInversionInTheSolution', () => {
    // Given an Expert exercise: 5 of the 11 chords are offered, including the right one
    const { play, type, types, onCheck } = renderExercise('expert')
    expect(types()).toEqual(['augmented', 'maj7', 'dominant 7', 'm7', 'm7♭5'])

    // When clicking dominant 7 for a played open F♯7/C♯
    fireEvent.click(play())
    expect(playInterval).toHaveBeenCalledWith([61, 66, 70, 76].map(toFrequency), true)
    fireEvent.click(type('dominant 7'))

    // Then it is a hit, and the solution names the inversion
    expect(screen.getByText(/You guessed right! It was a dominant 7 \(major \+ 7\), 2nd inversion\./)).toBeInTheDocument()
    expect(screen.getByText(/F♯7\/C♯: C♯ F♯ A♯ E/)).toBeInTheDocument()
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'dominant 7 (major + 7), 2nd inversion', isHit: true })
  })

  it('autoPlay_playsEachNewQuestion', () => {
    // Given / When an auto-play exercise
    const { type } = renderExercise('beginner', false, true)

    // Then the chord plays without clicking Play
    expect(playInterval).toHaveBeenCalledExactlyOnceWith([toFrequency(66), toFrequency(69), toFrequency(73)], false)

    // When answering then clicking Next
    fireEvent.click(type('major'))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Then the new chord plays too
    expect(playInterval).toHaveBeenCalledTimes(2)
  })

  it('next_whenLastQuestion_readsSeeScoreAndKeepsTheRound', () => {
    // Given a checked last question
    const { play, type, onNext } = renderExercise('beginner', true)
    fireEvent.click(play())
    fireEvent.click(type('minor'))

    // When clicking See score
    fireEvent.click(screen.getByRole('button', { name: 'See score' }))

    // Then the series is told, and no new round starts
    expect(onNext).toHaveBeenCalledOnce()
    expect(screen.getByText(/You guessed right! It was a minor\./)).toBeInTheDocument()
  })
})
