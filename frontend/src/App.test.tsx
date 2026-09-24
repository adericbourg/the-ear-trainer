import { render, screen } from '@testing-library/react'
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
})
