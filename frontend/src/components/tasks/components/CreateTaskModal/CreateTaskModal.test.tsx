import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateTaskModal } from './CreateTaskModal'

vi.mock('@/shared/store', () => ({
  useTasksStore:    vi.fn(),
  useContactsStore: vi.fn(),
}))

import { useTasksStore, useContactsStore } from '@/shared/store'

const mockCreateTask = vi.fn()
const mockContacts = [
  { id: 'c1', full_name: 'Иван Иванов' },
  { id: 'c2', full_name: 'Мария Петрова' },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useTasksStore).mockImplementation((sel: any) => sel({ createTask: mockCreateTask }))
  vi.mocked(useContactsStore).mockImplementation((sel: any) => sel({ contacts: mockContacts }))
})

describe('CreateTaskModal', () => {
  describe('rendering', () => {
    it('renders title input', () => {
      render(<CreateTaskModal isActive={true} onClose={vi.fn()} />)
      expect(screen.getByPlaceholderText('Введите название задачи')).toBeInTheDocument()
    })

    it('renders "Создать" button', () => {
      render(<CreateTaskModal isActive={true} onClose={vi.fn()} />)
      expect(screen.getByRole('button', { name: 'Создать' })).toBeInTheDocument()
    })

    it('"Создать" is disabled when title is empty', () => {
      render(<CreateTaskModal isActive={true} onClose={vi.fn()} />)
      expect(screen.getByRole('button', { name: 'Создать' })).toBeDisabled()
    })

    it('"Создать" is enabled when title is filled', () => {
      render(<CreateTaskModal isActive={true} onClose={vi.fn()} />)
      fireEvent.change(screen.getByPlaceholderText('Введите название задачи'), { target: { value: 'Позвонить' } })
      expect(screen.getByRole('button', { name: 'Создать' })).not.toBeDisabled()
    })

    it('renders contact options from store', () => {
      render(<CreateTaskModal isActive={true} onClose={vi.fn()} />)
      fireEvent.click(screen.getByText('— Без контакта —'))
      expect(screen.getByText('Иван Иванов')).toBeInTheDocument()
      expect(screen.getByText('Мария Петрова')).toBeInTheDocument()
    })
  })

  describe('submission', () => {
    it('calls createTask with title on submit', async () => {
      const onClose = vi.fn()
      render(<CreateTaskModal isActive={true} onClose={onClose} />)
      fireEvent.change(screen.getByPlaceholderText('Введите название задачи'), { target: { value: 'Новая задача' } })
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Новая задача' })
      ))
    })

    it('calls onClose after submission', async () => {
      const onClose = vi.fn()
      render(<CreateTaskModal isActive={true} onClose={onClose} />)
      fireEvent.change(screen.getByPlaceholderText('Введите название задачи'), { target: { value: 'Задача' } })
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => expect(onClose).toHaveBeenCalled())
    })

    it('trims whitespace from title before creating', async () => {
      const onClose = vi.fn()
      render(<CreateTaskModal isActive={true} onClose={onClose} />)
      fireEvent.change(screen.getByPlaceholderText('Введите название задачи'), { target: { value: '  Задача  ' } })
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Задача' })
      ))
    })

    it('uses initialContactId when provided', () => {
      render(<CreateTaskModal isActive={true} onClose={vi.fn()} initialContactId="c1" />)
      // Contact "Иван Иванов" should be selected (shown as trigger text)
      expect(screen.getAllByText('Иван Иванов').length).toBeGreaterThan(0)
    })

    it('"Отмена" calls onClose without creating', () => {
      const onClose = vi.fn()
      render(<CreateTaskModal isActive={true} onClose={onClose} />)
      fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
      expect(onClose).toHaveBeenCalled()
      expect(mockCreateTask).not.toHaveBeenCalled()
    })
  })
})
