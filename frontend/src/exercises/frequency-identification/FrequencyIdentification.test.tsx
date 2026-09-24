import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FrequencyIdentification from './FrequencyIdentification'
import { startTone, stopTone } from '../../tone'

vi.mock('../../tone', () => ({ startTone: vi.fn(), stopTone: vi.fn() }))

// Math.random() = 0.5 draws 1200 Hz, inside the initial selector (1000-1500 Hz); 0 draws 100 Hz, outside.
function renderExercise(random = 0.5) {
  vi.spyOn(Math, 'random').mockReturnValue(random)
  render(<FrequencyIdentification />)
  return {
    selector: screen.getByRole('slider', { name: 'Frequency guess' }),
    play: () => screen.getByRole('button', { name: /^(Play|Pause)$/ }),
    check: () => screen.getByRole('button', { name: 'Check' }),
  }
}

describe('FrequencyIdentification', () => {
  beforeEach(() => {
    vi.mocked(startTone).mockClear()
    vi.mocked(stopTone).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('playButton_togglesPlaybackAndEnablesCheck', () => {
    // Given a fresh exercise
    const { play, check } = renderExercise()
    expect(play()).toHaveAccessibleName('Play')
    expect(play()).toHaveAttribute('aria-keyshortcuts', 'Space')
    expect(check()).toBeDisabled()

    // When clicking Play
    fireEvent.click(play())

    // Then the target plays and Check is enabled
    expect(startTone).toHaveBeenCalledWith(1200)
    expect(play()).toHaveAccessibleName('Pause')
    expect(check()).toBeEnabled()

    // When clicking Pause
    fireEvent.click(play())

    // Then playback stops and Check stays enabled
    expect(stopTone).toHaveBeenCalled()
    expect(play()).toHaveAccessibleName('Play')
    expect(check()).toBeEnabled()
  })

  it('space_togglesPlaybackOnlyOutsideButtons', () => {
    // Given a fresh exercise
    const { selector, play, check } = renderExercise()

    // When pressing Space on the body
    fireEvent.keyDown(document.body, { key: ' ' })

    // Then playback starts
    expect(play()).toHaveAccessibleName('Pause')

    // When holding Space (repeated keydown)
    fireEvent.keyDown(selector, { key: ' ', repeat: true })

    // Then it is ignored
    expect(play()).toHaveAccessibleName('Pause')

    // When pressing Space on the selector
    fireEvent.keyDown(selector, { key: ' ' })

    // Then playback stops
    expect(play()).toHaveAccessibleName('Play')

    // When pressing Space on the Check button
    fireEvent.keyDown(check(), { key: ' ' })

    // Then playback is not toggled (the button keeps its native activation)
    expect(play()).toHaveAccessibleName('Play')
  })

  it('selector_movesWithKeyboard', () => {
    // Given the selector at its initial position
    const { selector } = renderExercise()
    expect(selector).toHaveAttribute('aria-valuetext', '1000 Hz to 1500 Hz')

    // When pressing PageUp, then Right arrow
    fireEvent.keyDown(selector, { key: 'PageUp' })
    expect(selector).toHaveAttribute('aria-valuetext', '2100 Hz to 2900 Hz')
    fireEvent.keyDown(selector, { key: 'ArrowRight' })
    expect(selector).toHaveAttribute('aria-valuetext', '2100 Hz to 3000 Hz')

    // When pressing Home, then End
    fireEvent.keyDown(selector, { key: 'Home' })
    expect(selector).toHaveAttribute('aria-valuetext', '100 Hz to 140 Hz')
    fireEvent.keyDown(selector, { key: 'End' })
    expect(selector).toHaveAttribute('aria-valuetext', '11000 Hz to 15000 Hz')

    // When pressing PageDown then Left arrow
    fireEvent.keyDown(selector, { key: 'PageDown' })
    expect(selector).toHaveAttribute('aria-valuetext', '5300 Hz to 7500 Hz')
    fireEvent.keyDown(selector, { key: 'ArrowLeft' })
    expect(selector).toHaveAttribute('aria-valuetext', '5200 Hz to 7300 Hz')
  })

  it('check_whenHit_locksSelectorAndShowsSuccess', () => {
    // Given a played target inside the selector
    const { selector, play, check } = renderExercise()
    fireEvent.click(play())

    // When clicking Check
    fireEvent.click(check())

    // Then the result is a hit, with a marker
    const next = screen.getByRole('button', { name: 'Next' })
    expect(next).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument()
    expect(screen.getByText('You guessed right! The actual frequency was 1200Hz.')).toBeInTheDocument()
    expect(screen.getByTestId('target-marker')).toBeInTheDocument()
    expect(selector).toHaveAttribute('aria-disabled', 'true')

    // And the selector is locked
    fireEvent.keyDown(selector, { key: 'PageUp' })
    expect(selector).toHaveAttribute('aria-valuetext', '1000 Hz to 1500 Hz')

    // And playback is still available
    fireEvent.click(play())
    expect(play()).toHaveAccessibleName('Play')
    fireEvent.click(play())
    expect(play()).toHaveAccessibleName('Pause')
  })

  it('check_whenMissOnEnter_showsMarker', () => {
    // Given a played target outside the selector
    const { selector, play } = renderExercise(0)
    fireEvent.click(play())

    // When pressing Enter on the selector
    fireEvent.keyDown(selector, { key: 'Enter' })

    // Then the result is a miss, with a marker
    expect(screen.getByText('Missed! The actual frequency was 100Hz.')).toBeInTheDocument()
    expect(screen.getByTestId('target-marker')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
  })

  it('next_startsANewRound', () => {
    // Given a checked miss, with playback running and the selector moved before check
    const { selector, play } = renderExercise(0)
    fireEvent.click(play())
    fireEvent.keyDown(selector, { key: 'End' })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    vi.mocked(Math.random).mockReturnValue(0.5)

    // When clicking Next
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Then audio stops and the round is reset
    expect(stopTone).toHaveBeenCalled()
    expect(play()).toHaveAccessibleName('Play')
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Missed!/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('target-marker')).not.toBeInTheDocument()
    expect(selector).toHaveAttribute('aria-valuetext', '1000 Hz to 1500 Hz')
    expect(selector).not.toHaveAttribute('aria-disabled', 'true')
    expect(selector).toHaveFocus()

    // And the new target is played next
    fireEvent.click(play())
    expect(startTone).toHaveBeenLastCalledWith(1200)
  })
})
