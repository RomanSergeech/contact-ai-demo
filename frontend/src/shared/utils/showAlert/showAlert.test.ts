import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { showAlert } from './showAlert'
import { useAlertStore } from '../../store'

beforeEach(() => {
  useAlertStore.setState({ alert: null, visible: false })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('showAlert', () => {
  it('calls show on the alert store with the provided props', () => {
    const props = { text: ['Something went wrong'], btnText: 'Close' }
    showAlert(props)
    const state = useAlertStore.getState()
    expect(state.visible).toBe(true)
    expect(state.alert).toEqual(props)
  })

  it('does not schedule auto-hide when time is not provided', () => {
    vi.useFakeTimers()
    showAlert({ text: ['msg'], btnText: 'OK' })
    vi.runAllTimers()
    expect(useAlertStore.getState().visible).toBe(true)
  })

  it('auto-hides after the specified timeout', () => {
    vi.useFakeTimers()
    showAlert({ text: ['msg'], btnText: 'OK' }, 3000)
    expect(useAlertStore.getState().visible).toBe(true)

    vi.advanceTimersByTime(2999)
    expect(useAlertStore.getState().visible).toBe(true)

    vi.advanceTimersByTime(1)
    expect(useAlertStore.getState().visible).toBe(false)
  })

  it('supports multiple text lines', () => {
    const props = { text: ['Line 1', 'Line 2', 'Line 3'], btnText: 'Got it' }
    showAlert(props)
    expect(useAlertStore.getState().alert?.text).toHaveLength(3)
  })
})
