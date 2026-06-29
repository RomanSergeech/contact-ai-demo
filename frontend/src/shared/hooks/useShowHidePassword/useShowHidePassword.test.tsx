import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useShowHidePassword } from './useShowHidePassword'

describe('useShowHidePassword', () => {
  it('starts with type "password"', () => {
    const { result } = renderHook(() => useShowHidePassword())
    expect(result.current.inputType).toBe('password')
  })

  it('setInputType changes the type directly', () => {
    const { result } = renderHook(() => useShowHidePassword())
    act(() => { result.current.setInputType('text') })
    expect(result.current.inputType).toBe('text')
  })

  it('returns a ShowHidePasswordSvgElement component', () => {
    const { result } = renderHook(() => useShowHidePassword())
    expect(typeof result.current.ShowHidePasswordSvgElement).toBe('function')
  })
})
