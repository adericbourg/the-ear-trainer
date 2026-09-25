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
    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
  })

  it('render_ofFrequencyIdentificationRoute_showsTheExerciseListedInTheMenu', () => {
    // Given the frequency identification route
    // When the App is rendered
    render(
      <MemoryRouter initialEntries={['/sound-engineering/frequency-identification']}>
        <App />
      </MemoryRouter>,
    )

    // Then the exercise is displayed
    expect(screen.getByRole('heading', { name: 'Frequency identification' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Frequency guess' })).toBeInTheDocument()

    // And it is listed in the menu
    fireEvent.click(screen.getByRole('button', { name: 'Sound engineering' }))
    expect(screen.getByRole('link', { name: 'Frequency identification' })).toHaveAttribute(
      'href',
      '/sound-engineering/frequency-identification',
    )
  })

  it('render_ofIntervalsRoute_showsTheSetupFirst', () => {
    // Given the intervals route
    // When the App is rendered
    render(
      <MemoryRouter initialEntries={['/pitch/intervals']}>
        <App />
      </MemoryRouter>,
    )

    // Then the setup is displayed, not the exercise
    expect(screen.getByRole('heading', { level: 1, name: 'Intervals' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Free practice' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scored series' })).toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })
})
