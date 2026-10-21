import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChordProgressions from './ChordProgressions'
import { progressionsOf, questionOf } from './progression'
import { toFrequency } from '../../pitch/intervals/interval'
import { playChords } from '../../../tone'

vi.mock('../../../tone', () => ({ playChords: vi.fn(), stopInterval: vi.fn() }))

// In Beginner, Math.random() = 0.5 draws IV I in F♯ major, and 0 draws I IV in C major.
function renderExercise(random: number) {
  vi.spyOn(Math, 'random').mockReturnValue(random)
  const onCheck = vi.fn()
  render(<ChordProgressions level="beginner" isLastQuestion={false} isAutoPlay={false} onCheck={onCheck} onNext={vi.fn()} />)
  return {
    onCheck,
    play: () => screen.getByRole('button', { name: 'Play' }),
    progression: (name: string) => within(screen.getByRole('group', { name: 'Progression' })).getByRole('button', { name }),
  }
}

describe('ChordProgressions', () => {
  beforeEach(() => {
    vi.mocked(playChords).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('progression_whenHit_showsTheKeyAndTheByTheWayNote', () => {
    // Given a played Beginner progression
    const { play, progression, onCheck } = renderExercise(0.5)
    fireEvent.click(play())

    // Then the tonic, a rest and the progression play
    const expected = questionOf('beginner', progressionsOf('beginner')[2]!, 6)
    expect(playChords).toHaveBeenCalledWith(expected.chords.map((chord) => chord.map(toFrequency)))

    // When clicking the right progression
    fireEvent.click(progression('IV I'))

    // Then it is a hit, with the key and what the progression is known as
    expect(onCheck).toHaveBeenCalledWith({ label: 'IV I', isHit: true })
    expect(screen.getByText(/You guessed right! It was IV I, in F♯ major\./)).toBeInTheDocument()
    expect(screen.getByText(/A plagal cadence/)).toBeInTheDocument()
  })

  it('progression_whenMissedOnAnUnnamedProgression_showsNoNote', () => {
    // Given a played I IV, which has no particular name
    const { play, progression, onCheck } = renderExercise(0)
    fireEvent.click(play())

    // When clicking another progression
    fireEvent.click(progression('V I'))

    // Then it is a miss, with the key only
    expect(onCheck).toHaveBeenCalledWith({ label: 'I IV', isHit: false })
    expect(screen.getByText('It was I IV, in C major.', { exact: false }).textContent).toBe('Missed! It was I IV, in C major.')
  })
})
