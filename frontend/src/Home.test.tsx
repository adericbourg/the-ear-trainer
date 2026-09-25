import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import Home from './Home'
import { CategoryId, ExerciseId, type Category, type Exercise } from './exercises'

const categories: Category[] = [
  { id: CategoryId('pitch'), name: 'Pitch' },
  { id: CategoryId('sound-engineering'), name: 'Sound engineering' },
]
const exercises: Exercise[] = [
  {
    id: ExerciseId('panning'),
    name: 'Panning',
    description: 'Locate a sound.',
    categoryId: CategoryId('sound-engineering'),
  },
  {
    id: ExerciseId('frequency'),
    name: 'Frequency identification',
    description: 'Guess a frequency.',
    categoryId: CategoryId('sound-engineering'),
  },
]

describe('Home', () => {
  it('render_listsExercisesUnderTheirCategory', () => {
    // Given a category without exercises and one with two
    // When the home page is rendered
    render(
      <MemoryRouter>
        <Home categories={categories} exercises={exercises} />
      </MemoryRouter>,
    )

    // Then only the category with exercises is listed
    expect(screen.getByRole('heading', { level: 1, name: 'The Ear Trainer' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Pitch' })).not.toBeInTheDocument()
    const section = screen.getByRole('region', { name: 'Sound engineering' })

    // And each exercise is shown in it with its description and a link to play it
    expect(within(section).getByRole('heading', { level: 3, name: 'Panning' })).toBeInTheDocument()
    expect(within(section).getByText('Locate a sound.')).toBeInTheDocument()
    expect(within(section).getByRole('heading', { level: 3, name: 'Frequency identification' })).toBeInTheDocument()
    expect(within(section).getByText('Guess a frequency.')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'Play Panning' })).toHaveAttribute(
      'href',
      '/sound-engineering/panning',
    )
    expect(within(section).getByRole('link', { name: 'Play Panning' })).toHaveTextContent('Play!')
  })
})
