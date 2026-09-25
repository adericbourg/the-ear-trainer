import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Series, { type ExerciseProps } from './Series'

// Answers a question in one click: Check then Next.
function FakeExercise({ level, isLastQuestion, onCheck, onNext }: ExerciseProps) {
  const answer = (isHit: boolean) => {
    onCheck({ label: isHit ? 'Easy one' : 'Hard one', isHit })
    onNext()
  }
  return (
    <>
      <p>Playing {level}</p>
      {isLastQuestion && <p>Last question</p>}
      <button type="button" onClick={() => answer(true)}>
        Hit
      </button>
      <button type="button" onClick={() => answer(false)}>
        Miss
      </button>
    </>
  )
}

const renderSeries = () => render(<Series exerciseName="Fake" Exercise={FakeExercise} />)
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const score = () => screen.queryByText(/^Score:/)

describe('Series', () => {
  it('render_showsTheSetupWithoutTheExercise', () => {
    // Given / When a fresh series
    renderSeries()

    // Then the level and mode are asked, and the exercise isn't rendered
    expect(screen.getByRole('heading', { level: 1, name: 'Fake' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Beginner' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Free practice' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scored series' })).toBeInTheDocument()
    expect(screen.getByText('A scored series has 10 questions.')).toBeInTheDocument()
    expect(screen.queryByText(/^Playing/)).not.toBeInTheDocument()
    expect(score()).not.toBeInTheDocument()
  })

  it('freePractice_isEndlessUntilStopped', () => {
    // Given the Advanced level
    renderSeries()
    fireEvent.click(screen.getByRole('radio', { name: 'Advanced' }))

    // When starting a free practice
    click('Free practice')

    // Then the exercise plays the chosen level, without score nor progress
    expect(screen.getByText('Playing advanced')).toBeInTheDocument()
    expect(screen.getByText('Level: Advanced')).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(score()).not.toBeInTheDocument()
    expect(screen.queryByText(/^Question/)).not.toBeInTheDocument()

    // When answering more than 10 questions
    for (let i = 0; i < 12; i++) click('Hit')

    // Then the practice goes on
    expect(screen.getByText('Playing advanced')).toBeInTheDocument()
    expect(screen.queryByText('Last question')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Results' })).not.toBeInTheDocument()

    // When clicking Stop
    click('Stop')

    // Then the setup is back, with the level kept and focused
    expect(screen.queryByText(/^Playing/)).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Advanced' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Advanced' })).toHaveFocus()
  })

  it('scoredSeries_scoresTenQuestionsThenShowsTheResults', () => {
    // Given the Intermediate level
    renderSeries()
    fireEvent.click(screen.getByRole('radio', { name: 'Intermediate' }))

    // When starting a scored series
    click('Scored series')

    // Then the exercise plays the chosen level, with no answer yet
    expect(screen.getByText('Playing intermediate')).toBeInTheDocument()
    expect(screen.getByText('Level: Intermediate')).toBeInTheDocument()
    expect(score()).toHaveTextContent('Score: –')
    expect(screen.getByText('Question 1 of 10')).toBeInTheDocument()

    // When answering a question right
    click('Hit')

    // Then the score and progress are updated
    expect(score()).toHaveTextContent('Score: 1/1')
    expect(screen.getByText('Question 2 of 10')).toBeInTheDocument()

    // When answering up to the last question
    for (let i = 0; i < 8; i++) click(i % 3 === 0 ? 'Miss' : 'Hit')
    expect(screen.getByText('Question 10 of 10')).toBeInTheDocument()
    expect(screen.getByText('Last question')).toBeInTheDocument()
    click('Miss')

    // Then the results replace the exercise, focused and described by the score
    expect(screen.queryByText(/^Playing/)).not.toBeInTheDocument()
    const results = screen.getByRole('heading', { level: 2, name: 'Results' })
    expect(results).toHaveFocus()
    expect(results).toHaveAccessibleDescription('Score: 6/10')
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(10)
    expect(items[0]).toHaveTextContent(/Easy one — passed$/)
    expect(items[1]).toHaveTextContent(/Hard one — failed$/)
    expect(items[9]).toHaveTextContent(/Hard one — failed$/)

    // When starting a new series
    click('New series')

    // Then the setup is back, with the level kept
    expect(screen.getByRole('radio', { name: 'Intermediate' })).toBeChecked()
    expect(score()).not.toBeInTheDocument()
  })

  it('abandonSeries_discardsTheAnswers', () => {
    // Given a series with an answer
    renderSeries()
    click('Scored series')
    click('Hit')

    // When abandoning it
    click('Abandon series')

    // Then the setup is back
    expect(screen.queryByText(/^Playing/)).not.toBeInTheDocument()
    expect(score()).not.toBeInTheDocument()

    // And a new series starts from scratch
    click('Scored series')
    expect(score()).toHaveTextContent('Score: –')
    expect(screen.getByText('Question 1 of 10')).toBeInTheDocument()
  })
})
