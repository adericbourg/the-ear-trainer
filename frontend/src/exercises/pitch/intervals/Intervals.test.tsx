import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Intervals from './Intervals'
import { toFrequency, type Level } from './interval'
import { playInterval, stopInterval } from '../../../tone'

vi.mock('../../../tone', () => ({ playInterval: vi.fn(), stopInterval: vi.fn() }))

// Math.random() = 0.5 draws a major 3rd (MIDI 64 to 68) in Beginner, and a 5th + 1 octave in Expert.
function renderExercise(level: Level = 'beginner', isLastQuestion = false, isAutoPlay = false) {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  const onCheck = vi.fn()
  const onNext = vi.fn()
  const { unmount } = render(<Intervals level={level} isLastQuestion={isLastQuestion} isAutoPlay={isAutoPlay} onCheck={onCheck} onNext={onNext} />)
  return {
    onCheck,
    onNext,
    unmount,
    play: () => screen.getByRole('button', { name: 'Play' }),
    // The last child is the name; the first one is the key hint.
    answers: () => within(screen.getByRole('group', { name: 'Interval' })).getAllByRole('button').map((button) => button.lastChild?.textContent),
    keys: () => within(screen.getByRole('group', { name: 'Interval' })).getAllByRole('button').map((button) => button.getAttribute('aria-keyshortcuts')),
    answer: (name: string) => within(screen.getByRole('group', { name: 'Interval' })).getByRole('button', { name }),
  }
}

describe('Intervals', () => {
  beforeEach(() => {
    vi.mocked(playInterval).mockClear()
    vi.mocked(stopInterval).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('answers_areEnabledOncePlayed', () => {
    // Given a fresh Beginner exercise, focused on the first answer
    const { play, answer, onCheck } = renderExercise()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument()
    expect(answer('minor 2nd')).toHaveFocus()
    expect(answer('minor 2nd')).toHaveAttribute('aria-disabled', 'true')
    expect(play()).toHaveAttribute('aria-keyshortcuts', 'Space')

    // When clicking an answer, or pressing its key, before playing
    fireEvent.click(answer('major 3rd'))
    fireEvent.keyDown(document, { key: '4', code: 'Digit4' })

    // Then nothing is submitted
    expect(onCheck).not.toHaveBeenCalled()

    // When clicking Play
    fireEvent.click(play())

    // Then the interval plays melodically and the answers are enabled
    expect(playInterval).toHaveBeenCalledWith([toFrequency(64), toFrequency(68)], false)
    expect(answer('minor 2nd')).not.toHaveAttribute('aria-disabled', 'true')

    // And Space replays from an answer, but not from another button
    fireEvent.keyDown(answer('minor 2nd'), { key: ' ' })
    expect(playInterval).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(play(), { key: ' ' })
    expect(playInterval).toHaveBeenCalledTimes(2)

    // And a key with a modifier doesn't answer (browser shortcuts)
    fireEvent.keyDown(document, { key: '4', code: 'Digit4', metaKey: true })
    expect(onCheck).not.toHaveBeenCalled()

    // When pressing the 4th answer's key, on the physical key (here AZERTY, where it types an apostrophe)
    fireEvent.keyDown(document, { key: "'", code: 'Digit4' })

    // Then major 3rd is answered
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'major 3rd', isHit: true })
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
  })

  it('answers_haveOneButtonPerIntervalOfTheLevel', () => {
    // Given a Beginner exercise
    const { answers, keys, unmount } = renderExercise()

    // Then each answer is a full interval name, with a digit key by position
    expect(answers()).toEqual(['minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd', '4th', '5th', 'Octave'])
    expect(keys()).toEqual(['1', '2', '3', '4', '5', '6', '7'])
    unmount()

    // Given an Intermediate exercise
    const { answers: intermediateAnswers, keys: intermediateKeys, unmount: unmountIntermediate } = renderExercise('intermediate')

    // Then the Tritone, major 6th and minor 7th are answers too, and the 10th answer's key is 0
    expect(intermediateAnswers()).toEqual(['minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd', '4th', 'Tritone', '5th', 'major 6th', 'minor 7th', 'Octave'])
    expect(intermediateKeys().at(-1)).toBe('0')
    unmountIntermediate()

    // Given an Advanced exercise
    const { answers: advancedAnswers, keys: advancedKeys } = renderExercise('advanced')

    // Then the minor 6th is an answer too, and the 11th and 12th answers' keys are - and =
    expect(advancedAnswers()).toContain('minor 6th')
    expect(advancedKeys().slice(-2)).toEqual(['-', '='])
  })

  it('answer_whenHit_locksAnswersAndShowsSuccess', () => {
    // Given a played major 3rd
    const { play, answer, onCheck } = renderExercise()
    fireEvent.click(play())

    // When clicking major 3rd
    fireEvent.click(answer('major 3rd'))

    // Then the result is a hit
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
    expect(screen.getByText('You guessed right! It was a major 3rd.')).toBeInTheDocument()
    expect(answer('major 3rd')).toHaveAttribute('data-result', 'hit')
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'major 3rd', isHit: true })

    // And the answers are locked
    expect(answer('4th')).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(answer('4th'))
    expect(onCheck).toHaveBeenCalledOnce()

    // And playback is still available
    fireEvent.click(play())
    expect(playInterval).toHaveBeenCalledTimes(2)
  })

  it('answer_whenMiss_showsTheRightAnswer', () => {
    // Given a played major 3rd
    const { play, answer, onCheck } = renderExercise()
    fireEvent.click(play())

    // When clicking 4th
    fireEvent.click(answer('4th'))

    // Then the result is a miss, and the right answer is shown
    expect(screen.getByText('Missed! It was a major 3rd.')).toBeInTheDocument()
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'major 3rd', isHit: false })
    expect(answer('4th')).toHaveAttribute('data-result', 'miss')
    expect(answer('major 3rd')).toHaveAttribute('data-result', 'hit')
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
  })

  it('next_startsANewRound', () => {
    // Given a checked miss
    const { play, answer, onNext } = renderExercise()
    fireEvent.click(play())
    fireEvent.click(answer('Octave'))

    // When clicking Next
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Then the series is told, audio stops and the round is reset
    expect(onNext).toHaveBeenCalledOnce()
    expect(stopInterval).toHaveBeenCalled()
    expect(screen.queryByText(/Missed!/)).not.toBeInTheDocument()
    expect(answer('Octave')).not.toHaveAttribute('data-result')
    expect(answer('major 3rd')).not.toHaveAttribute('data-result')
    expect(answer('minor 2nd')).toHaveAttribute('aria-disabled', 'true')
    expect(answer('minor 2nd')).toHaveFocus()

    // And a different interval is drawn (the same random value now draws a 4th)
    fireEvent.click(play())
    fireEvent.click(answer('4th'))
    expect(screen.getByText('You guessed right! It was a 4th.')).toBeInTheDocument()
  })

  it('autoPlay_playsEachNewQuestion', () => {
    // Given / When an auto-play exercise
    const { answer } = renderExercise('beginner', false, true)

    // Then the interval plays without clicking Play
    expect(playInterval).toHaveBeenCalledExactlyOnceWith([toFrequency(64), toFrequency(68)], false)
    expect(answer('minor 2nd')).not.toHaveAttribute('aria-disabled', 'true')

    // When answering then clicking Next
    fireEvent.click(answer('major 3rd'))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Then the new interval plays too
    expect(playInterval).toHaveBeenCalledTimes(2)
    expect(answer('minor 2nd')).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('next_whenLastQuestion_readsSeeScoreAndKeepsTheRound', () => {
    // Given a checked last question
    const { play, answer, onNext } = renderExercise('beginner', true)
    fireEvent.click(play())
    fireEvent.click(answer('major 3rd'))

    // When clicking See score
    fireEvent.click(screen.getByRole('button', { name: 'See score' }))

    // Then the series is told, and no new round starts
    expect(onNext).toHaveBeenCalledOnce()
    expect(screen.getByText('You guessed right! It was a major 3rd.')).toBeInTheDocument()
  })

  it('expert_showsOctavesAndPlaysHarmonically', () => {
    // Given an Expert exercise
    const { play, answer } = renderExercise('expert')

    // Then octave buttons are shown
    expect(screen.getByText(/Pick the octave first \(or press O\) if the interval is wider than an octave\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+0' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '+0' })).toHaveAttribute('aria-keyshortcuts', 'O')

    // When pressing O three times
    fireEvent.keyDown(document, { key: 'o', code: 'KeyO' })
    expect(screen.getByRole('button', { name: '+1 octave' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(document, { key: 'o', code: 'KeyO' })
    expect(screen.getByRole('button', { name: '+2 octaves' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(document, { key: 'o', code: 'KeyO' })

    // Then the octave wraps back to +0
    expect(screen.getByRole('button', { name: '+0' })).toHaveAttribute('aria-pressed', 'true')

    // When answering a 5th + 1 octave to a harmonic 5th + 1 octave
    fireEvent.click(play())
    expect(vi.mocked(playInterval).mock.lastCall?.[1]).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '+1 octave' }))
    fireEvent.click(answer('5th'))

    // Then it is a hit
    expect(screen.getByText('You guessed right! It was a 5th + 1 octave.')).toBeInTheDocument()
  })

  it('beginner_hidesTheOctaves', () => {
    renderExercise()
    expect(screen.queryByText(/wider than an octave/)).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Octaves' })).not.toBeInTheDocument()
  })
})
