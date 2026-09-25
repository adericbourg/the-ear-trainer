import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Intervals from './Intervals'
import { toFrequency, type Level } from './interval'
import { playInterval, stopInterval } from '../../../tone'

vi.mock('../../../tone', () => ({ playInterval: vi.fn(), stopInterval: vi.fn() }))

// Math.random() = 0.5 draws a major 3rd (MIDI 64 to 68) in Beginner, and a 5th + 1 octave in Expert.
function renderExercise(level: Level = 'beginner', isLastQuestion = false) {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  const onCheck = vi.fn()
  const onNext = vi.fn()
  const { unmount } = render(<Intervals level={level} isLastQuestion={isLastQuestion} onCheck={onCheck} onNext={onNext} />)
  return {
    onCheck,
    onNext,
    unmount,
    slider: screen.getByRole('slider', { name: 'Interval guess' }),
    play: () => screen.getByRole('button', { name: 'Play' }),
    check: () => screen.getByRole('button', { name: 'Check' }),
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

  it('check_isEnabledOncePlayed', () => {
    // Given a fresh Beginner exercise, focused on the middle stop
    const { slider, play, check } = renderExercise()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(slider).toHaveFocus()
    expect(slider).toHaveAttribute('aria-valuetext', 'major 3rd')
    expect(play()).toHaveAttribute('aria-keyshortcuts', 'Space')
    expect(check()).toBeDisabled()

    // When clicking Play
    fireEvent.click(play())

    // Then the interval plays melodically and Check is enabled
    expect(playInterval).toHaveBeenCalledWith([toFrequency(64), toFrequency(68)], false)
    expect(check()).toBeEnabled()

    // And Space replays from the slider, but not from a button
    fireEvent.keyDown(slider, { key: ' ' })
    expect(playInterval).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(play(), { key: ' ' })
    expect(playInterval).toHaveBeenCalledTimes(2)
  })

  it('slider_hasOneStopPerIntervalOfTheLevel', () => {
    // Given a Beginner exercise
    const { slider, unmount } = renderExercise()

    // When moving with the keyboard
    // Then each stop is a full interval name, without qualifier buttons
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(slider).toHaveAttribute('aria-valuetext', 'minor 3rd')
    fireEvent.keyDown(slider, { key: 'ArrowUp' })
    expect(slider).toHaveAttribute('aria-valuetext', 'major 3rd')
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(slider).toHaveAttribute('aria-valuetext', 'minor 2nd')
    fireEvent.keyDown(slider, { key: 'End' })
    expect(slider).toHaveAttribute('aria-valuetext', 'Octave')
    expect(screen.queryByRole('group', { name: 'Quality' })).not.toBeInTheDocument()
    unmount()

    // Given an Intermediate exercise
    const { slider: intermediateSlider, unmount: unmountIntermediate } = renderExercise('intermediate')

    // Then the Tritone, major 6th and minor 7th follow the 4th
    expect(intermediateSlider).toHaveAttribute('aria-valuetext', '4th')
    fireEvent.keyDown(intermediateSlider, { key: 'ArrowRight' })
    expect(intermediateSlider).toHaveAttribute('aria-valuetext', 'Tritone')
    fireEvent.keyDown(intermediateSlider, { key: 'ArrowRight' })
    fireEvent.keyDown(intermediateSlider, { key: 'ArrowRight' })
    expect(intermediateSlider).toHaveAttribute('aria-valuetext', 'major 6th')
    fireEvent.keyDown(intermediateSlider, { key: 'ArrowDown' })
    fireEvent.keyDown(intermediateSlider, { key: 'ArrowRight' })
    fireEvent.keyDown(intermediateSlider, { key: 'ArrowRight' })
    expect(intermediateSlider).toHaveAttribute('aria-valuetext', 'minor 7th')
    unmountIntermediate()

    // Given an Advanced exercise
    const { slider: advancedSlider } = renderExercise('advanced')
    fireEvent.keyDown(advancedSlider, { key: 'Home' })
    for (let i = 0; i < 7; i++) fireEvent.keyDown(advancedSlider, { key: 'ArrowRight' })

    // Then the minor 6th is a stop too
    expect(advancedSlider).toHaveAttribute('aria-valuetext', 'minor 6th')
  })

  it('check_whenHit_locksControlsAndShowsSuccess', () => {
    // Given a played major 3rd, answered as a major 3rd
    const { slider, play, check, onCheck } = renderExercise()
    fireEvent.click(play())

    // When clicking Check
    fireEvent.click(check())

    // Then the result is a hit, with a marker
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument()
    expect(screen.getByText('You guessed right! It was a major 3rd.')).toBeInTheDocument()
    expect(screen.getByTestId('target-marker')).toBeInTheDocument()
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'major 3rd', isHit: true })

    // And the slider is locked
    expect(slider).toHaveAttribute('aria-disabled', 'true')
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(slider).toHaveAttribute('aria-valuetext', 'major 3rd')

    // And playback is still available
    fireEvent.click(play())
    expect(playInterval).toHaveBeenCalledTimes(2)
  })

  it('check_whenMissOnEnter_showsMarker', () => {
    // Given a played major 3rd, answered as a 4th
    const { slider, play, onCheck } = renderExercise()
    fireEvent.click(play())
    fireEvent.keyDown(slider, { key: 'ArrowRight' })

    // When pressing Enter on the slider
    fireEvent.keyDown(slider, { key: 'Enter' })

    // Then the result is a miss
    expect(screen.getByText('Missed! It was a major 3rd.')).toBeInTheDocument()
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'major 3rd', isHit: false })
    expect(screen.getByTestId('target-marker')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
  })

  it('next_startsANewRound', () => {
    // Given a checked miss, with the slider moved before check
    const { slider, play, onNext } = renderExercise()
    fireEvent.click(play())
    fireEvent.keyDown(slider, { key: 'End' })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))

    // When clicking Next
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Then the series is told, audio stops and the round is reset
    expect(onNext).toHaveBeenCalledOnce()
    expect(stopInterval).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
    expect(screen.queryByText(/Missed!/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('target-marker')).not.toBeInTheDocument()
    expect(slider).toHaveAttribute('aria-valuetext', 'major 3rd')
    expect(slider).not.toHaveAttribute('aria-disabled', 'true')
    expect(slider).toHaveFocus()

    // And a different interval is drawn (the same random value now draws a 4th)
    fireEvent.click(play())
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    fireEvent.keyDown(slider, { key: 'Enter' })
    expect(screen.getByText('You guessed right! It was a 4th.')).toBeInTheDocument()
  })

  it('next_whenLastQuestion_readsSeeScoreAndKeepsTheRound', () => {
    // Given a checked last question
    const { play, onNext } = renderExercise('beginner', true)
    fireEvent.click(play())
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))

    // When clicking See score
    fireEvent.click(screen.getByRole('button', { name: 'See score' }))

    // Then the series is told, and no new round starts
    expect(onNext).toHaveBeenCalledOnce()
    expect(screen.getByText('You guessed right! It was a major 3rd.')).toBeInTheDocument()
  })

  it('expert_showsOctavesAndPlaysHarmonically', () => {
    // Given an Expert exercise
    const { slider, play } = renderExercise('expert')

    // Then octave buttons are shown
    expect(screen.getByText(/Use the octave buttons if the interval is wider than an octave\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+0' })).toHaveAttribute('aria-pressed', 'true')

    // When answering a 5th + 1 octave to a harmonic 5th + 1 octave
    fireEvent.click(play())
    expect(vi.mocked(playInterval).mock.lastCall?.[1]).toBe(true)
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    fireEvent.click(screen.getByRole('button', { name: '+1 octave' }))
    expect(slider).toHaveAttribute('aria-valuetext', '5th + 1 octave')
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))

    // Then it is a hit
    expect(screen.getByText('You guessed right! It was a 5th + 1 octave.')).toBeInTheDocument()
  })

  it('beginner_hidesTheOctaves', () => {
    renderExercise()
    expect(screen.queryByText(/wider than an octave/)).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Octaves' })).not.toBeInTheDocument()
  })
})
