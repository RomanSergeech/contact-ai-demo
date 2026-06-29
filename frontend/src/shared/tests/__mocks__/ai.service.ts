import { vi } from 'vitest'

export default {
  getHistory:            vi.fn(),
  sendMessage:           vi.fn(),
  clearHistory:          vi.fn(),
  generateTaskMeta:      vi.fn(),
  parseContactFromVoice: vi.fn(),
}
