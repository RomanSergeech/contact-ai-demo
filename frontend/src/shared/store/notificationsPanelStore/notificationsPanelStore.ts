import { create } from 'zustand'


interface TStore {
  isOpen: boolean
  open:  () => void
  close: () => void
}

export const useNotificationsPanelStore = create<TStore>((set) => ({
  isOpen: false,
  open:   () => set({ isOpen: true }),
  close:  () => set({ isOpen: false }),
}))
