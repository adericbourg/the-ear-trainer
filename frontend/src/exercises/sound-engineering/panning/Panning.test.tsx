import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Level } from '../../pitch/intervals/interval'
import Panning from './Panning'
import { startNoise, stopTone } from '../../../tone'

vi.mock('../../../tone', () => ({ startNoise: vi.fn(), stopTone: vi.fn() }))

// Math.random() = 0.5 draws C (0), inside the initial Beginner selector (L25-R25); 0 draws L100, outside.
function renderExercise(random = 0.5, level: Level = 'beginner', isLastQuestion = false) {
  vi.spyOn(Math, 'random').mockReturnValue(random)
  const onCheck = vi.fn()
  const onNext = vi.fn()
  render(<Panning level={level} isLastQuestion={isLastQuestion} onCheck={onCheck} onNext={onNext} />)
  return {
    onCheck,
    onNext,
    selector: screen.getByRole('slider', { name: 'Pan guess' }),
    play: () => screen.getByRole('button', { name: /^(Play|Pause)$/ }),
    check: () => screen.getByRole('button', { name: 'Check' }),
  }
}

describe('Panning', () => {
  beforeEach(() => {
    vi.mocked(startNoise).mockClear()
    vi.mocked(stopTone).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('playButton_togglesPlaybackAndEnablesCheck', () => {
    // Given a fresh exercise, focused on the selector
    const { selector, play, check } = renderExercise()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(selector).toHaveFocus()
    expect(screen.getByText(/Put on headphones/)).toBeInTheDocument()
    expect(play()).toHaveAccessibleName('Play')
    expect(play()).toHaveAttribute('aria-keyshortcuts', 'Space')
    expect(check()).toBeDisabled()

    // When clicking Play
    fireEvent.click(play())

    // Then the target plays and Check is enabled
    expect(startNoise).toHaveBeenCalledWith(0)
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
    // Given the Intermediate selector at its initial position
    const { selector } = renderExercise(0.5, 'intermediate')
    expect(selector).toHaveAttribute('aria-valuetext', 'L15 to R15')

    // When pressing PageUp, then Right arrow
    fireEvent.keyDown(selector, { key: 'PageUp' })
    expect(selector).toHaveAttribute('aria-valuetext', 'L5 to R25')
    fireEvent.keyDown(selector, { key: 'ArrowRight' })
    expect(selector).toHaveAttribute('aria-valuetext', 'L4 to R26')

    // When pressing Home, then End
    fireEvent.keyDown(selector, { key: 'Home' })
    expect(selector).toHaveAttribute('aria-valuetext', 'L100 to L70')
    fireEvent.keyDown(selector, { key: 'End' })
    expect(selector).toHaveAttribute('aria-valuetext', 'R70 to R100')
    expect(selector).toHaveAttribute('aria-valuenow', '85')

    // When pressing PageDown then Left arrow
    fireEvent.keyDown(selector, { key: 'PageDown' })
    expect(selector).toHaveAttribute('aria-valuetext', 'R60 to R90')
    fireEvent.keyDown(selector, { key: 'ArrowLeft' })
    expect(selector).toHaveAttribute('aria-valuetext', 'R59 to R89')
  })

  it('check_whenHit_locksSelectorAndShowsSuccess', () => {
    // Given a played target inside the selector
    const { selector, play, check, onCheck } = renderExercise()
    fireEvent.click(play())

    // When clicking Check
    fireEvent.click(check())

    // Then the result is a hit, with a marker
    const next = screen.getByRole('button', { name: 'Next' })
    expect(next).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument()
    expect(screen.getByText('You guessed right! The sound was panned C.')).toBeInTheDocument()
    expect(screen.getByTestId('target-marker')).toBeInTheDocument()
    expect(selector).toHaveAttribute('aria-disabled', 'true')
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'C', isHit: true })

    // And the selector is locked
    fireEvent.keyDown(selector, { key: 'PageUp' })
    expect(selector).toHaveAttribute('aria-valuetext', 'L25 to R25')
  })

  it('check_whenMissOnEnter_showsMarker', () => {
    // Given a played target outside the selector
    const { selector, play, onCheck } = renderExercise(0)
    fireEvent.click(play())

    // When pressing Enter on the selector
    fireEvent.keyDown(selector, { key: 'Enter' })

    // Then the result is a miss, with a marker
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: 'L100', isHit: false })
    expect(screen.getByText('Missed! The sound was panned L100.')).toBeInTheDocument()
    expect(screen.getByTestId('target-marker')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
  })

  it('next_startsANewRound', () => {
    // Given a checked miss, with playback running and the selector moved before check
    const { selector, play, onNext } = renderExercise(0)
    fireEvent.click(play())
    fireEvent.keyDown(selector, { key: 'End' })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    vi.mocked(Math.random).mockReturnValue(0.5)

    // When clicking Next
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Then the series is told, audio stops and the round is reset
    expect(onNext).toHaveBeenCalledOnce()
    expect(stopTone).toHaveBeenCalled()
    expect(play()).toHaveAccessibleName('Play')
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Missed!/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('target-marker')).not.toBeInTheDocument()
    expect(selector).toHaveAttribute('aria-valuetext', 'L25 to R25')
    expect(selector).not.toHaveAttribute('aria-disabled', 'true')
    expect(selector).toHaveFocus()

    // And the new target is played next
    fireEvent.click(play())
    expect(startNoise).toHaveBeenLastCalledWith(0)
  })

  it('next_whenLastQuestion_readsSeeScoreAndKeepsTheRound', () => {
    // Given a checked last question
    const { play, check, onNext } = renderExercise(0.5, 'beginner', true)
    fireEvent.click(play())
    fireEvent.click(check())

    // When clicking See score
    fireEvent.click(screen.getByRole('button', { name: 'See score' }))

    // Then the series is told, and no new round starts
    expect(onNext).toHaveBeenCalledOnce()
    expect(screen.getByText(/You guessed right!/)).toBeInTheDocument()
  })

  it('level_narrowsTheSelector', () => {
    // Given an Expert exercise
    const { selector } = renderExercise(0.5, 'expert')

    // Then the selector is narrower
    expect(selector).toHaveAttribute('aria-valuetext', 'L6 to R6')
    expect(parseFloat(selector.style.width)).toBeCloseTo(6)
  })
})
