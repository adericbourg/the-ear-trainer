import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import MenuBar from './MenuBar'
import { CategoryId, ExerciseId, type Category, type Exercise } from './exercises'

const categories: Category[] = [
  { id: CategoryId('pitch'), name: 'Pitch' },
  { id: CategoryId('sound-engineering'), name: 'Sound engineering' },
]
const exercises: Exercise[] = [
  { id: ExerciseId('panning'), name: 'Panning', description: '', categoryId: CategoryId('sound-engineering') },
  { id: ExerciseId('frequency'), name: 'Frequency identification', description: '', categoryId: CategoryId('sound-engineering') },
]

// Compile-time guards (checked by `tsc -b`): ids are not interchangeable with plain strings nor with each other.
// @ts-expect-error a plain string is not a CategoryId
void ('pitch' satisfies CategoryId)
// @ts-expect-error an ExerciseId is not a CategoryId
void (ExerciseId('panning') satisfies CategoryId)

function renderMenuBar(path = '/') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <MenuBar categories={categories} exercises={exercises} />
    </MemoryRouter>,
  )
}

describe('MenuBar', () => {
  it('render_linksTitleToHome', () => {
    // Given / When the menu bar is rendered
    renderMenuBar('/sound-engineering/panning')

    // Then the title links to the home page
    expect(screen.getByRole('link', { name: 'The Ear Trainer' })).toHaveAttribute('href', '/')
  })

  it('render_ofCategoryWithoutExercise_doesNotRenderIt', () => {
    // Given a category without exercises
    // When the menu bar is rendered
    renderMenuBar()

    // Then only categories with exercises are rendered
    expect(screen.queryByRole('button', { name: 'Pitch' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sound engineering' })).toBeInTheDocument()
  })

  it('categoryButton_opensOnClickAndClosesOnEscape', () => {
    // Given a closed category
    renderMenuBar()
    const button = screen.getByRole('button', { name: 'Sound engineering' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Panning' })).not.toBeInTheDocument()

    // When clicking it
    fireEvent.click(button)

    // Then its exercises are shown
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Panning' })).toHaveAttribute('href', '/sound-engineering/panning')

    // When pressing Escape
    fireEvent.keyDown(screen.getByRole('link', { name: 'Panning' }), { key: 'Escape' })

    // Then the submenu closes and focus returns to the button
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('categoryButton_opensWithKeyboard', () => {
    // Given a focused category button
    renderMenuBar()
    const button = screen.getByRole('button', { name: 'Sound engineering' })
    button.focus()

    // When pressing Enter (native buttons turn Enter/Space into a click)
    fireEvent.keyDown(button, { key: 'Enter' })
    fireEvent.click(button)

    // Then the submenu opens
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('exerciseLink_ofCurrentExercise_isMarkedAsCurrentPage', () => {
    // Given the current route is an exercise
    renderMenuBar('/sound-engineering/panning')

    // When opening its category
    fireEvent.click(screen.getByRole('button', { name: 'Sound engineering' }))

    // Then only that exercise is marked as current
    expect(screen.getByRole('link', { name: 'Panning' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Frequency identification' })).not.toHaveAttribute('aria-current')
  })

  it('burgerButton_togglesTheMenu', () => {
    // Given a closed burger menu
    renderMenuBar()
    const burger = screen.getByRole('button', { name: 'Menu' })
    expect(burger).toHaveAttribute('aria-expanded', 'false')

    // When clicking it twice
    fireEvent.click(burger)
    expect(burger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(burger)

    // Then it is closed again
    expect(burger).toHaveAttribute('aria-expanded', 'false')
  })
})
