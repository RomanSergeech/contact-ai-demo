import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AiPromptSection } from './AiPromptSection'

vi.mock('@/shared/store', () => ({
  useUserStore: vi.fn(),
}))

import { useUserStore } from '@/shared/store'

const mockSaveAiPrompt = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  vi.clearAllMocks()
  mockSaveAiPrompt.mockResolvedValue(undefined)
  vi.mocked(useUserStore).mockReturnValue({
    ai_system_prompt: 'Текущий промпт',
    saveAiPrompt: mockSaveAiPrompt,
  } as any)
})

describe('AiPromptSection', () => {
  it('показывает текущий промпт в textarea', () => {
    render(<AiPromptSection />)
    expect(screen.getByDisplayValue('Текущий промпт')).toBeInTheDocument()
  })

  it('показывает пустую textarea когда ai_system_prompt=null', () => {
    vi.mocked(useUserStore).mockReturnValue({ ai_system_prompt: null, saveAiPrompt: mockSaveAiPrompt } as any)
    render(<AiPromptSection />)
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('вызывает saveAiPrompt с новым значением при нажатии "Сохранить"', async () => {
    render(<AiPromptSection />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Новый промпт' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(mockSaveAiPrompt).toHaveBeenCalledWith('Новый промпт'))
  })

  it('показывает "Сохранение..." и блокирует кнопку во время сохранения', () => {
    mockSaveAiPrompt.mockReturnValue(new Promise(() => {}))
    render(<AiPromptSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText('Сохранение...')).toBeInTheDocument()
  })

  it('показывает "✓ Сохранено" после успешного сохранения', async () => {
    render(<AiPromptSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(screen.getByText('✓ Сохранено')).toBeInTheDocument())
  })
})
