import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('render_displaysAppTitle', () => {
    // Given the App component
    // When it is rendered
    render(<App />)

    // Then the app title is displayed
    expect(screen.getByRole('heading', { name: 'The Ear Trainer' })).toBeInTheDocument()
  })
})
