import { describe, it, expect, beforeEach } from 'vitest'
import { useAlertStore } from './alertStore'

const alert = { text: ['Error occurred'], btnText: 'Close' }

beforeEach(() => {
  useAlertStore.setState({ alert: null, visible: false })
})

describe('alert.store', () => {
  it('starts with no alert and invisible', () => {
    const state = useAlertStore.getState()
    expect(state.alert).toBeNull()
    expect(state.visible).toBe(false)
  })

  it('show() sets alert and makes it visible', () => {
    useAlertStore.getState().show(alert)
    const state = useAlertStore.getState()
    expect(state.visible).toBe(true)
    expect(state.alert).toEqual(alert)
  })

  it('hide() sets visible to false', () => {
    useAlertStore.getState().show(alert)
    useAlertStore.getState().hide()
    expect(useAlertStore.getState().visible).toBe(false)
  })

  it('hide() preserves the alert data (does not null it)', () => {
    useAlertStore.getState().show(alert)
    useAlertStore.getState().hide()
    expect(useAlertStore.getState().alert).toEqual(alert)
  })

  it('show() replaces a previous alert', () => {
    const first = { text: ['First'], btnText: 'OK' }
    const second = { text: ['Second'], btnText: 'Got it' }
    useAlertStore.getState().show(first)
    useAlertStore.getState().show(second)
    expect(useAlertStore.getState().alert).toEqual(second)
  })
})
