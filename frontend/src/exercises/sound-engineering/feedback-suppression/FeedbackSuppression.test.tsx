import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Level } from '../../pitch/intervals/interval'
import FeedbackSuppression from './FeedbackSuppression'
import { FLAT_EQ } from './eq'
import { setMixEq, startMix, stopMix } from '../../../tone'

vi.mock('../../../tone', () => ({ startMix: vi.fn(() => Promise.resolve()), setMixEq: vi.fn(), stopMix: vi.fn() }))

// Math.random() = 0.5 draws one feedback at 1 kHz on Beginner, where the Mid freq starts.
function renderExercise(level: Level = 'beginner', isLastQuestion = false, isAutoPlay = false) {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  const onCheck = vi.fn()
  const onNext = vi.fn()
  const { unmount } = render(<FeedbackSuppression level={level} isLastQuestion={isLastQuestion} isAutoPlay={isAutoPlay} onCheck={onCheck} onNext={onNext} />)
  return {
    onCheck,
    onNext,
    unmount,
    slider: (name: string) => screen.getByRole('slider', { name }),
    play: () => screen.getByRole('button', { name: /^(Play|Pause)$/ }),
    check: () => screen.getByRole('button', { name: 'Check' }),
  }
}

describe('FeedbackSuppression', () => {
  beforeEach(() => {
    vi.mocked(startMix).mockClear()
    vi.mocked(setMixEq).mockClear()
    vi.mocked(stopMix).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('level_showsTheControlsOfTheLevel', () => {
    // Given a Beginner exercise, Then only the mid controls show, the first one focused
    const { unmount } = renderExercise()
    expect(screen.getAllByRole('slider').map((s) => s.getAttribute('aria-valuetext'))).toEqual(['1 kHz', '0 dB'])
    expect(screen.getByRole('slider', { name: 'Mid freq' })).toHaveFocus()
    unmount()

    // Given an Intermediate exercise, Then the whole channel strip shows, top to bottom
    renderExercise('intermediate')
    expect(screen.getAllByRole('slider').map((s) => s.closest('label')!.firstChild!.textContent)).toEqual(['High', 'Mid freq', 'Mid', 'Low', 'Low cut'])
    expect(screen.getByRole('slider', { name: 'Low cut' })).toHaveAttribute('aria-valuetext', 'Off')
  })

  it('play_startsTheMixAndSlidersUpdateIt', () => {
    // Given a fresh exercise
    const { play, check, slider } = renderExercise()
    expect(play()).toHaveAttribute('aria-keyshortcuts', 'Space')
    expect(check()).toBeDisabled()

    // When clicking Play
    fireEvent.click(play())

    // Then the drawn sample (the band at 0.5) plays with the feedback, and Check is enabled
    expect(startMix).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('band'), [1000], FLAT_EQ)
    expect(play()).toHaveAccessibleName('Pause')
    expect(check()).toBeEnabled()

    // When moving the sliders
    fireEvent.change(slider('Mid'), { target: { value: '-6' } })
    fireEvent.change(slider('Mid freq'), { target: { value: '100' } })

    // Then the mix follows, with logarithmic frequencies
    expect(setMixEq).toHaveBeenLastCalledWith({ ...FLAT_EQ, mid: -6, midFrequency: 8000 })
    expect(slider('Mid')).toHaveAttribute('aria-valuetext', '−6 dB')
    expect(slider('Mid freq')).toHaveAttribute('aria-valuetext', '8 kHz')

    // When pressing Space on a slider
    fireEvent.keyDown(slider('Mid'), { key: ' ' })

    // Then playback stops
    expect(stopMix).toHaveBeenCalled()
    expect(play()).toHaveAccessibleName('Play')
  })

  it('play_whenTheSampleFailsToLoad_showsAnError', async () => {
    // Given a sample that fails to load
    vi.mocked(startMix).mockRejectedValueOnce(new Error('offline'))
    const { play } = renderExercise()

    // When clicking Play
    fireEvent.click(play())

    // Then an error shows and playback is off
    expect(await screen.findByRole('alert')).toHaveTextContent('The sample could not be loaded.')
    expect(play()).toHaveAccessibleName('Play')
  })

  it('check_whenSuppressed_isAHit', () => {
    // Given the feedback cut by 6 dB
    const { play, check, slider, onCheck } = renderExercise()
    fireEvent.click(play())
    fireEvent.change(slider('Mid'), { target: { value: '-6' } })

    // When clicking Check
    fireEvent.click(check())

    // Then it is a hit, the sliders are locked and Next is focused
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: '1 kHz', isHit: true })
    expect(screen.getByText('Feedback suppressed! It rang at 1 kHz.')).toBeInTheDocument()
    expect(slider('Mid')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
  })

  it('check_whenRingingOrOverCut_isAMissSayingWhy', () => {
    // Given an Advanced exercise (feedbacks at low and high frequencies), cut everywhere but the high one rings
    const { play, check, slider, onCheck } = renderExercise('advanced')
    fireEvent.click(play())
    fireEvent.change(slider('Low cut'), { target: { value: '100' } })
    fireEvent.change(slider('Low'), { target: { value: '-15' } })
    fireEvent.change(slider('Mid'), { target: { value: '-15' } })

    // When clicking Check
    fireEvent.click(check())

    // Then it is a miss, telling what still rings and that the sound is damaged
    expect(onCheck).toHaveBeenCalledExactlyOnceWith({ label: '95 Hz, 9.8 kHz', isHit: false })
    expect(screen.getByText('Missed! Feedback rang at 95 Hz, 9.8 kHz. Still ringing: 9.8 kHz. Too much cut: the sound is damaged.')).toBeInTheDocument()
  })

  it('next_startsANewRound', () => {
    // Given a checked question with the EQ moved
    const { play, check, slider, onNext } = renderExercise()
    fireEvent.click(play())
    fireEvent.change(slider('Mid'), { target: { value: '-6' } })
    fireEvent.click(check())

    // When clicking Next
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Then the series is told, audio stops and the EQ is flat again
    expect(onNext).toHaveBeenCalledOnce()
    expect(stopMix).toHaveBeenCalled()
    expect(play()).toHaveAccessibleName('Play')
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
    expect(slider('Mid')).toHaveAttribute('aria-valuetext', '0 dB')
    expect(slider('Mid')).toBeEnabled()
    expect(slider('Mid freq')).toHaveFocus()
    expect(screen.queryByText(/Feedback suppressed/)).not.toBeInTheDocument()
  })

  it('autoPlay_playsEachNewQuestion', () => {
    // Given / When an auto-play exercise
    const { play, check } = renderExercise('beginner', false, true)

    // Then the mix plays without clicking Play
    expect(startMix).toHaveBeenCalledOnce()
    expect(play()).toHaveAccessibleName('Pause')

    // When checking then clicking Next
    fireEvent.click(check())
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Then the new question plays too
    expect(startMix).toHaveBeenCalledTimes(2)
    expect(play()).toHaveAccessibleName('Pause')
  })

  it('next_whenLastQuestion_readsSeeScoreAndKeepsTheRound', () => {
    // Given a checked last question
    const { play, check, onNext } = renderExercise('beginner', true)
    fireEvent.click(play())
    fireEvent.click(check())

    // When clicking See score
    fireEvent.click(screen.getByRole('button', { name: 'See score' }))

    // Then the series is told, and no new round starts
    expect(onNext).toHaveBeenCalledOnce()
    expect(screen.getByText(/Missed!/)).toBeInTheDocument()
  })
})
