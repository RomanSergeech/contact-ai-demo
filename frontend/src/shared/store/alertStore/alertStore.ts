import { create } from 'zustand'

type TAlert = {
  text: string[]
  btnText: string
}

interface TState {
  alert: TAlert | null
  visible: boolean
}

interface TStore extends TState {
  show: (alert: TAlert) => void
  hide: () => void
}

export const useAlertStore = create<TStore>((set) => ({
  alert: null,
  visible: false,

  show: (alert) => set({ alert, visible: true }),
  hide: () => set({ visible: false }),
}))
