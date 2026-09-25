import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('render_ofUnknownRoute_redirectsToHome', () => {
    // Given an unknown route
    // When the App is rendered
    render(
      <MemoryRouter initialEntries={['/unknown/route/here']}>
        <App />
      </MemoryRouter>,
    )

    // Then the home page is displayed
    expect(screen.getByRole('heading', { level: 1, name: 'The Ear Trainer' })).toBeInTheDocument()
  })

  it('render_ofFrequencyIdentificationRoute_showsTheExerciseListedInTheMenu', () => {
    // Given the frequency identification route
    // When the App is rendered
    render(
      <MemoryRouter initialEntries={['/sound-engineering/frequency-identification']}>
        <App />
      </MemoryRouter>,
    )

    // Then the setup is displayed first
    expect(screen.getByRole('heading', { name: 'Frequency identification' })).toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scored series' })).toBeInTheDocument()

    // And the exercise once a mode is picked
    fireEvent.click(screen.getByRole('button', { name: 'Free practice' }))
    expect(screen.getByRole('slider', { name: 'Frequency guess' })).toBeInTheDocument()

    // And it is listed in the menu
    fireEvent.click(screen.getByRole('button', { name: 'Sound engineering' }))
    expect(screen.getByRole('link', { name: 'Frequency identification' })).toHaveAttribute(
      'href',
      '/sound-engineering/frequency-identification',
    )
  })
})
