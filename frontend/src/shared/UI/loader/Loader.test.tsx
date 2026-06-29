import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Loader } from './Loader'

describe('Loader', () => {
  it('renders a spinner element', () => {
    const { container } = render(<Loader />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders without fullScreen by default', () => {
    const { container } = render(<Loader />)
    const loader = container.firstChild as HTMLElement
    expect(loader.getAttribute('data-fullscreen')).toBeNull()
  })

  it('adds data-fullscreen attribute when fullScreen prop is true', () => {
    const { container } = render(<Loader fullScreen />)
    const loader = container.firstChild as HTMLElement
    expect(loader.getAttribute('data-fullscreen')).toBe('true')
  })
})
