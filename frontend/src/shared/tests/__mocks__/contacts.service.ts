import { vi } from 'vitest'

export default {
  getAll:       vi.fn(),
  getById:      vi.fn(),
  create:       vi.fn(),
  update:       vi.fn(),
  delete:       vi.fn(),
  deleteMany:   vi.fn(),
  uploadPhoto:  vi.fn(),
  getLogs:      vi.fn().mockResolvedValue({ data: { logs: [] } }),
  resolveLog:   vi.fn(),
}
