import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ActionBar } from './ActionBar'
import { makeContact } from '@/shared/tests/factories'

vi.mock('@/shared/store', () => ({
  useContactsStore: vi.fn(),
}))

import { useContactsStore } from '@/shared/store'

const mockUpdateContact = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useContactsStore).mockReturnValue({
    updateContact: mockUpdateContact,
  } as any)
})

afterEach(() => { vi.restoreAllMocks() })

describe('ActionBar', () => {
  const contact = makeContact({ id: 'c1' })

  describe('рендеринг', () => {
    it('показывает кнопку "Сохранить"', () => {
      render(<ActionBar contact={contact} isScraping={false} />)
      expect(screen.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument()
    })

    it('"Сохранить" заблокирована при isScraping=true', () => {
      render(<ActionBar contact={contact} isScraping={true} />)
      expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()
    })
  })

  describe('сохранение', () => {
    it('вызывает updateContact с id контакта', async () => {
      render(<ActionBar contact={contact} isScraping={false} />)
      fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
      await waitFor(() => expect(mockUpdateContact).toHaveBeenCalledWith('c1', expect.any(Object)))
    })

    it('показывает "Сохранение..." и блокирует кнопку во время сохранения', () => {
      mockUpdateContact.mockReturnValue(new Promise(() => {}))
      render(<ActionBar contact={contact} isScraping={false} />)
      fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
      expect(screen.getByRole('button', { name: 'Сохранение...' })).toBeDisabled()
    })
  })
})
