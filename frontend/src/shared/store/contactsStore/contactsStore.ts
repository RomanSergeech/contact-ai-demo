import { create } from 'zustand'
import { tryCatch, showAlert } from '../../utils'
import { ContactsService } from '../../api'

import type { TContact, TContactScrapingLog } from '../../types/contact.types'
import type { TResolveContactLogResponse } from '../../types/api.types'


interface TState {
  contacts: TContact[]
  loading: boolean
}

interface TStore extends TState {
  loadContacts: () => Promise<void>
  createContact: (body: Partial<TContact>) => Promise<TContact>
  updateContact: (id: string, updates: Partial<TContact>) => Promise<void>
  deleteContact: (id: string) => Promise<void>
  deleteContacts: (ids: string[]) => Promise<{ deleted: string[]; failed: string[] }>
  fetchContactById: (id: string) => Promise<TContact>
  uploadContactPhoto: (contactId: string, file: File) => Promise<void>
  deleteContactPhoto: (contactId: string) => Promise<void>
  fetchLogs: (contactId: string) => Promise<TContactScrapingLog[]>
  resolveLog: (contactId: string, logId: string, field: string, choice: 'old' | 'new' | 'merge') => Promise<TResolveContactLogResponse>
}

const initialState: TState = {
  contacts: [],
  loading: false,
}

const onError = (msg: string) => showAlert({ text: [msg], btnText: 'Закрыть' }, 5000)

export const useContactsStore = create<TStore>((set) => ({
  ...initialState,

  loadContacts: () => tryCatch({
    callback: async () => {
      set({ loading: true })
      const { data } = await ContactsService.getAll()
      set({ contacts: data })
    },
    onFinally: () => set({ loading: false }),
  }),

  createContact: (body) => tryCatch({
    callback: async () => {
      const { data: contact } = await ContactsService.create(body)
      set((s) => ({ contacts: [contact, ...s.contacts] }))
      return contact
    },
    onError,
  }),

  updateContact: (id, updates) => tryCatch({
    callback: async () => {
      const { data: contact } = await ContactsService.update(id, updates)
      set((s) => ({ contacts: s.contacts.map(c => c.id === id ? contact : c) }))
    },
    onError,
  }),

  deleteContact: (id) => tryCatch({
    callback: async () => {
      await ContactsService.delete(id)
      set((s) => ({ contacts: s.contacts.filter(c => c.id !== id) }))
    },
    onError,
  }),

  deleteContacts: (ids) => tryCatch({
    callback: async () => {
      const { data } = await ContactsService.deleteMany(ids)
      set((s) => ({ contacts: s.contacts.filter(c => !data.deleted.includes(c.id)) }))
      if (data.failed.length > 0) {
        showAlert({ text: [`Не удалось удалить ${data.failed.length} контакт(а)`], btnText: 'Закрыть' }, 5000)
      }
      return data
    },
    onError,
  }),

  fetchContactById: (id) => tryCatch({
    callback: async () => {
      const { data } = await ContactsService.getById(id)
      return data
    },
  }),

  uploadContactPhoto: (contactId, file) => tryCatch({
    callback: async () => {
      const { data } = await ContactsService.uploadPhoto(contactId, file)
      set((s) => ({
        contacts: s.contacts.map(c => c.id === contactId ? { ...c, photo: data.photo } : c),
      }))
    },
    onError,
  }),

  deleteContactPhoto: (contactId) => tryCatch({
    callback: async () => {
      const { data } = await ContactsService.deletePhoto(contactId)
      set((s) => ({
        contacts: s.contacts.map(c => c.id === contactId ? { ...c, photo: data.photo } : c),
      }))
    },
    onError,
  }),

  fetchLogs: (contactId) => tryCatch({
    callback: async () => {
      const { data } = await ContactsService.getLogs(contactId)
      return data.logs
    },
  }),

  resolveLog: (contactId, logId, field, choice) => tryCatch({
    callback: async () => {
      const { data } = await ContactsService.resolveLog(contactId, logId, field, choice)
      return data
    },
    onError,
  }),
}))
