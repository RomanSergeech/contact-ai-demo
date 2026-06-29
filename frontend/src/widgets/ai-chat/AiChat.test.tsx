import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AiChat } from './AiChat'

// scrollIntoView is not implemented in jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn()

const mockCreateTask = vi.fn()

vi.mock('@/shared/api', async () => ({
  AiService: (await import('../../shared/tests/__mocks__/ai.service')).default,
}))

vi.mock('@/shared/store', () => ({
  useTasksStore: vi.fn((sel: any) => sel({ createTask: mockCreateTask })),
}))

import { AiService } from '@/shared/api'

const defaultProps = { contactId: 'c1', contactName: 'Тест Контакт' }

const emptyHistory = { data: { history: [] } }
const oneUserMsg = { data: { history: [{ role: 'user', content: 'Привет' }] } }
const oneAssistMsg = { data: { history: [{ role: 'assistant', content: 'Здравствуй!' }] } }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(AiService.getHistory).mockResolvedValue(emptyHistory as never)
  vi.mocked(AiService.clearHistory).mockResolvedValue(undefined as never)
})

describe('AiChat', () => {
  describe('history fetch', () => {
    it('calls getHistory with the correct contactId on mount', async () => {
      render(<AiChat {...defaultProps} />)
      await waitFor(() => expect(AiService.getHistory).toHaveBeenCalledWith('c1'))
    })

    it('renders messages from history', async () => {
      vi.mocked(AiService.getHistory).mockResolvedValue(oneUserMsg as never)
      render(<AiChat {...defaultProps} />)
      await waitFor(() => expect(screen.getByText('Привет')).toBeInTheDocument())
    })

    it('normalises assistant role to "ai"', async () => {
      vi.mocked(AiService.getHistory).mockResolvedValue(oneAssistMsg as never)
      render(<AiChat {...defaultProps} />)
      await waitFor(() => expect(screen.getByText('Здравствуй!')).toBeInTheDocument())
    })

    it('re-fetches when contactId prop changes', async () => {
      const { rerender } = render(<AiChat {...defaultProps} />)
      await waitFor(() => expect(AiService.getHistory).toHaveBeenCalledTimes(1))
      rerender(<AiChat contactId="c2" contactName="Другой" />)
      await waitFor(() => expect(AiService.getHistory).toHaveBeenCalledWith('c2'))
    })
  })

  describe('panel toggle', () => {
    it('opens the panel when the tab button is clicked', () => {
      render(<AiChat {...defaultProps} />)
      fireEvent.click(screen.getByLabelText('Открыть чат'))
      expect(screen.getByLabelText('Закрыть чат')).toBeInTheDocument()
    })

    it('closes the panel when the tab button is clicked again', () => {
      render(<AiChat {...defaultProps} />)
      fireEvent.click(screen.getByLabelText('Открыть чат'))
      fireEvent.click(screen.getByLabelText('Закрыть чат'))
      expect(screen.getByLabelText('Открыть чат')).toBeInTheDocument()
    })
  })

  describe('input', () => {
    it('updates the textarea value on change', () => {
      render(<AiChat {...defaultProps} />)
      const textarea = screen.getByPlaceholderText('Напишите сообщение...')
      fireEvent.change(textarea, { target: { value: 'привет' } })
      expect(textarea).toHaveValue('привет')
    })

    it('send button is disabled when input is empty', () => {
      render(<AiChat {...defaultProps} />)
      expect(screen.getByLabelText('Отправить')).toBeDisabled()
    })

    it('send button is enabled when input has text', () => {
      render(<AiChat {...defaultProps} />)
      fireEvent.change(screen.getByPlaceholderText('Напишите сообщение...'), {
        target: { value: 'hello' },
      })
      expect(screen.getByLabelText('Отправить')).not.toBeDisabled()
    })
  })

  describe('sending messages', () => {
    beforeEach(() => {
      vi.mocked(AiService.sendMessage).mockResolvedValue({ data: { text: 'Ответ ИИ' } } as never)
    })

    it('calls sendMessage with contactId and trimmed text', async () => {
      render(<AiChat {...defaultProps} />)
      fireEvent.change(screen.getByPlaceholderText('Напишите сообщение...'), {
        target: { value: '  Вопрос  ' },
      })
      fireEvent.click(screen.getByLabelText('Отправить'))
      await waitFor(() =>
        expect(AiService.sendMessage).toHaveBeenCalledWith('c1', 'Вопрос')
      )
    })

    it('shows the user message immediately after send', () => {
      render(<AiChat {...defaultProps} />)
      fireEvent.change(screen.getByPlaceholderText('Напишите сообщение...'), {
        target: { value: 'Вопрос' },
      })
      fireEvent.click(screen.getByLabelText('Отправить'))
      expect(screen.getByText('Вопрос')).toBeInTheDocument()
    })

    it('shows the AI response after successful send', async () => {
      render(<AiChat {...defaultProps} />)
      fireEvent.change(screen.getByPlaceholderText('Напишите сообщение...'), {
        target: { value: 'Вопрос' },
      })
      fireEvent.click(screen.getByLabelText('Отправить'))
      await waitFor(() => expect(screen.getByText('Ответ ИИ')).toBeInTheDocument())
    })

    it('clears the input after send', () => {
      render(<AiChat {...defaultProps} />)
      const textarea = screen.getByPlaceholderText('Напишите сообщение...')
      fireEvent.change(textarea, { target: { value: 'msg' } })
      fireEvent.click(screen.getByLabelText('Отправить'))
      expect(textarea).toHaveValue('')
    })

    it('shows an error message when sendMessage fails', async () => {
      vi.mocked(AiService.sendMessage).mockRejectedValue(new Error('network'))
      render(<AiChat {...defaultProps} />)
      fireEvent.change(screen.getByPlaceholderText('Напишите сообщение...'), {
        target: { value: 'msg' },
      })
      fireEvent.click(screen.getByLabelText('Отправить'))
      await waitFor(() =>
        expect(screen.getByText('Не удалось подключиться к серверу.')).toBeInTheDocument()
      )
    })

    it('Enter key triggers send', async () => {
      render(<AiChat {...defaultProps} />)
      const textarea = screen.getByPlaceholderText('Напишите сообщение...')
      fireEvent.change(textarea, { target: { value: 'msg' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      await waitFor(() => expect(AiService.sendMessage).toHaveBeenCalled())
    })

    it('Shift+Enter does not trigger send', () => {
      render(<AiChat {...defaultProps} />)
      const textarea = screen.getByPlaceholderText('Напишите сообщение...')
      fireEvent.change(textarea, { target: { value: 'msg' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
      expect(AiService.sendMessage).not.toHaveBeenCalled()
    })
  })

  describe('clear chat', () => {
    it('clear button is not shown when there are no messages', async () => {
      render(<AiChat {...defaultProps} />)
      await waitFor(() => expect(AiService.getHistory).toHaveBeenCalled())
      expect(screen.queryByTitle('Очистить чат')).not.toBeInTheDocument()
    })

    it('clear button is shown when messages exist', async () => {
      vi.mocked(AiService.getHistory).mockResolvedValue(oneUserMsg as never)
      render(<AiChat {...defaultProps} />)
      await waitFor(() => expect(screen.getByTitle('Очистить чат')).toBeInTheDocument())
    })

    it('calls clearHistory with contactId', async () => {
      vi.mocked(AiService.getHistory).mockResolvedValue(oneUserMsg as never)
      render(<AiChat {...defaultProps} />)
      await waitFor(() => screen.getByTitle('Очистить чат'))
      fireEvent.click(screen.getByTitle('Очистить чат'))
      await waitFor(() =>
        expect(AiService.clearHistory).toHaveBeenCalledWith('c1')
      )
    })

    it('removes all messages from the UI after clear', async () => {
      vi.mocked(AiService.getHistory).mockResolvedValue(oneUserMsg as never)
      render(<AiChat {...defaultProps} />)
      await waitFor(() => screen.getByText('Привет'))
      fireEvent.click(screen.getByTitle('Очистить чат'))
      await waitFor(() => expect(screen.queryByText('Привет')).not.toBeInTheDocument())
    })
  })

  describe('task creation button', () => {
    const msgWithPlan = '1. Написать письмо\n2. Позвонить'
    const msgWithoutPlan = 'Просто текст без нумерованного плана'

    it('shows task button for AI messages that contain an action plan', async () => {
      vi.mocked(AiService.getHistory).mockResolvedValue({
        data: { history: [{ role: 'assistant', content: msgWithPlan }] },
      } as never)
      render(<AiChat {...defaultProps} />)
      await waitFor(() => expect(screen.getByText('+ Добавить задачу')).toBeInTheDocument())
    })

    it('does not show task button for AI messages without an action plan', async () => {
      vi.mocked(AiService.getHistory).mockResolvedValue({
        data: { history: [{ role: 'assistant', content: msgWithoutPlan }] },
      } as never)
      render(<AiChat {...defaultProps} />)
      await waitFor(() => screen.getByText(msgWithoutPlan))
      expect(screen.queryByText('+ Добавить задачу')).not.toBeInTheDocument()
    })

    it('does not show task button for user messages even with numbered list', async () => {
      vi.mocked(AiService.getHistory).mockResolvedValue({
        data: { history: [{ role: 'user', content: msgWithPlan }] },
      } as never)
      render(<AiChat {...defaultProps} />)
      // Match partial text since RTL normalises \n to space
      await waitFor(() => screen.getByText(/Написать письмо/))
      expect(screen.queryByText('+ Добавить задачу')).not.toBeInTheDocument()
    })

    it('calls generateTaskMeta and createTask when button is clicked', async () => {
      vi.mocked(AiService.getHistory).mockResolvedValue({
        data: { history: [{ role: 'assistant', content: msgWithPlan }] },
      } as never)
      vi.mocked(AiService.generateTaskMeta).mockResolvedValue({
        data: { title: 'Задача', priority: 'medium', deadline: null },
      } as never)
      render(<AiChat {...defaultProps} />)
      await waitFor(() => screen.getByText('+ Добавить задачу'))
      fireEvent.click(screen.getByText('+ Добавить задачу'))
      await waitFor(() => {
        expect(AiService.generateTaskMeta).toHaveBeenCalledWith(msgWithPlan)
        expect(mockCreateTask).toHaveBeenCalled()
      })
    })

    it('shows "✓ Задача добавлена" after task is created', async () => {
      vi.mocked(AiService.getHistory).mockResolvedValue({
        data: { history: [{ role: 'assistant', content: msgWithPlan }] },
      } as never)
      vi.mocked(AiService.generateTaskMeta).mockResolvedValue({
        data: { title: 'T', priority: 'low', deadline: null },
      } as never)
      render(<AiChat {...defaultProps} />)
      await waitFor(() => screen.getByText('+ Добавить задачу'))
      fireEvent.click(screen.getByText('+ Добавить задачу'))
      await waitFor(() =>
        expect(screen.getByText('✓ Задача добавлена')).toBeInTheDocument()
      )
    })

    it('button is disabled after task is added', async () => {
      vi.mocked(AiService.getHistory).mockResolvedValue({
        data: { history: [{ role: 'assistant', content: msgWithPlan }] },
      } as never)
      vi.mocked(AiService.generateTaskMeta).mockResolvedValue({
        data: { title: 'T', priority: 'low', deadline: null },
      } as never)
      render(<AiChat {...defaultProps} />)
      await waitFor(() => screen.getByText('+ Добавить задачу'))
      fireEvent.click(screen.getByText('+ Добавить задачу'))
      await waitFor(() => screen.getByText('✓ Задача добавлена'))
      expect(screen.getByText('✓ Задача добавлена').closest('button')).toBeDisabled()
    })
  })
})
