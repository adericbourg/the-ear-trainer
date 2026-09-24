import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Intervals from './Intervals'
import { toFrequency } from './interval'
import { playInterval, stopInterval } from '../../tone'

vi.mock('../../tone', () => ({ playInterval: vi.fn(), stopInterval: vi.fn() }))

// Math.random() = 0.5 draws a major 3rd (MIDI 64 to 68) in Beginner, and a 5th + 1 octave in Expert.
function renderExercise() {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  render(<Intervals />)
  return {
    slider: screen.getByRole('slider', { name: 'Interval guess' }),
    play: () => screen.getByRole('button', { name: 'Play' }),
    check: () => screen.getByRole('button', { name: 'Check' }),
    qualities: () => screen.queryByRole('group', { name: 'Quality' }),
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

  it('check_isEnabledOnlyOncePlayedAndAnswerComplete', () => {
    // Given a fresh Beginner exercise, on the middle stop
    const { slider, play, check, qualities } = renderExercise()
    expect(screen.getByRole('radio', { name: 'Beginner' })).toBeChecked()
    expect(slider).toHaveAttribute('aria-valuetext', '4th')
    expect(play()).toHaveAttribute('aria-keyshortcuts', 'Space')
    expect(check()).toBeDisabled()

    // When clicking Play
    fireEvent.click(play())

    // Then the interval plays melodically and Check is enabled (the 4th needs no qualifier)
    expect(playInterval).toHaveBeenCalledWith([toFrequency(64), toFrequency(68)], false)
    expect(check()).toBeEnabled()

    // When moving to a stop that needs a qualifier
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })

    // Then Check waits for the qualifier
    expect(slider).toHaveAttribute('aria-valuetext', '3rd')
    expect(check()).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'major' }))
    expect(screen.getByRole('button', { name: 'major' })).toHaveAttribute('aria-pressed', 'true')
    expect(slider).toHaveAttribute('aria-valuetext', 'major 3rd')
    expect(check()).toBeEnabled()

    // And the qualifier resets when the stop changes
    fireEvent.keyDown(slider, { key: 'ArrowDown' })
    expect(slider).toHaveAttribute('aria-valuetext', '2nd')
    expect(screen.getByRole('button', { name: 'minor' })).toHaveAttribute('aria-pressed', 'false')
    expect(check()).toBeDisabled()

    // And Space replays from the slider, but not from a button
    fireEvent.keyDown(slider, { key: ' ' })
    expect(playInterval).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(play(), { key: ' ' })
    expect(playInterval).toHaveBeenCalledTimes(2)
    expect(qualities()).toBeInTheDocument()
  })

  it('qualifiers_areShownOnlyForStopsWithTwoPooledQualities', () => {
    // Given the Intermediate level
    const { slider, qualities } = renderExercise()
    fireEvent.click(screen.getByRole('radio', { name: 'Intermediate' }))

    // Then the Tritone stop offers both spellings, and 6th / 7th have an implicit quality
    expect(slider).toHaveAttribute('aria-valuetext', 'Tritone')
    expect(screen.getByRole('button', { name: 'augmented 4th' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'diminished 5th' })).toBeInTheDocument()
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(slider).toHaveAttribute('aria-valuetext', 'major 6th')
    expect(qualities()).not.toBeInTheDocument()
    fireEvent.keyDown(slider, { key: 'ArrowUp' })
    expect(slider).toHaveAttribute('aria-valuetext', 'minor 7th')
    fireEvent.keyDown(slider, { key: 'End' })
    expect(slider).toHaveAttribute('aria-valuetext', 'Octave')
    expect(qualities()).not.toBeInTheDocument()
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(slider).toHaveAttribute('aria-valuetext', '2nd')
    expect(screen.queryByRole('group', { name: 'Octaves' })).not.toBeInTheDocument()

    // When switching to Advanced
    fireEvent.click(screen.getByRole('radio', { name: 'Advanced' }))
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    fireEvent.keyDown(slider, { key: 'ArrowRight' })

    // Then the 6th needs a qualifier
    expect(slider).toHaveAttribute('aria-valuetext', '6th')
    expect(screen.getByRole('button', { name: 'minor' })).toBeInTheDocument()
  })

  it('check_whenHit_locksControlsAndShowsSuccess', () => {
    // Given a played major 3rd, answered as a major 3rd
    const { slider, play, check } = renderExercise()
    fireEvent.click(play())
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    fireEvent.click(screen.getByRole('button', { name: 'major' }))

    // When clicking Check
    fireEvent.click(check())

    // Then the result is a hit, with a marker
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument()
    expect(screen.getByText('You guessed right! It was a major 3rd.')).toBeInTheDocument()
    expect(screen.getByTestId('target-marker')).toBeInTheDocument()

    // And the controls are locked
    expect(slider).toHaveAttribute('aria-disabled', 'true')
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(slider).toHaveAttribute('aria-valuetext', 'major 3rd')
    expect(screen.getByRole('button', { name: 'minor' })).toBeDisabled()

    // And playback is still available
    fireEvent.click(play())
    expect(playInterval).toHaveBeenCalledTimes(2)
  })

  it('check_whenMissOnEnter_showsMarker', () => {
    // Given a played major 3rd, answered as a 4th
    const { slider, play } = renderExercise()
    fireEvent.click(play())

    // When pressing Enter on the slider
    fireEvent.keyDown(slider, { key: 'Enter' })

    // Then the result is a miss
    expect(screen.getByText('Missed! It was a major 3rd.')).toBeInTheDocument()
    expect(screen.getByTestId('target-marker')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
  })

  it('next_startsANewRound', () => {
    // Given a checked miss, with the slider moved before check
    const { slider, play } = renderExercise()
    fireEvent.click(play())
    fireEvent.keyDown(slider, { key: 'End' })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))

    // When clicking Next
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Then audio stops and the round is reset
    expect(stopInterval).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
    expect(screen.queryByText(/Missed!/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('target-marker')).not.toBeInTheDocument()
    expect(slider).toHaveAttribute('aria-valuetext', '4th')
    expect(slider).not.toHaveAttribute('aria-disabled', 'true')
    expect(slider).toHaveFocus()

    // And a different interval is drawn (the same random value now draws a 4th)
    fireEvent.click(play())
    fireEvent.keyDown(slider, { key: 'Enter' })
    expect(screen.getByText('You guessed right! It was a 4th.')).toBeInTheDocument()
  })

  it('levelChange_resetsTheRoundAndShowsOctavesOnlyInExpert', () => {
    // Given a checked Beginner round
    const { slider, play } = renderExercise()
    fireEvent.click(play())
    fireEvent.keyDown(slider, { key: 'Enter' })
    expect(screen.queryByText(/wider than an octave/)).not.toBeInTheDocument()

    // When switching to Expert
    fireEvent.click(screen.getByRole('radio', { name: 'Expert' }))

    // Then audio stops, the round is reset, and octave buttons appear
    expect(stopInterval).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
    expect(screen.queryByText(/Missed!/)).not.toBeInTheDocument()
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
})
