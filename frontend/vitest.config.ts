// Fix timezone so new Date(year, month, day) === UTC midnight in all tests
process.env.TZ = 'UTC'

import { defineConfig } from 'vitest/config'
import path from 'path'

// Transform .scss/.css imports so they don't break in jsdom
// .scss modules return a Proxy so class lookups return the key name (e.g. c.foo === 'foo')
// plain .css (e.g. react-datepicker) are treated as empty side-effect imports
const scssMock = {
  name: 'scss-module-mock',
  enforce: 'pre' as const,
  transform(_: string, id: string) {
    if (id.endsWith('.scss')) {
      return { code: `export default new Proxy({}, { get: (_, k) => k })` }
    }
    if (id.endsWith('.css')) {
      return { code: '' }
    }
  },
}

export default defineConfig({
  plugins: [scssMock],
  test: {
    environment: 'jsdom',
    setupFiles:  ['./src/shared/tests/setup.ts'],
    exclude:     ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      provider:  'v8',
      include:   [
        'src/shared/utils/**',
        'src/shared/store/**',
        'src/shared/hooks/**',
        'src/shared/config/**',
        'src/shared/UI/**',
        'src/widgets/**',
      ],
      exclude:   [
        'src/shared/utils/index.ts',
        'src/shared/hooks/index.ts',
        'src/shared/UI/index.ts',
        'src/shared/store/index.ts',
        'src/shared/store/*.store.ts',
        'src/shared/config/pages.config.ts',
        'src/widgets/index.ts',
      ],
      thresholds: { lines: 80, functions: 80 },
      reporter:  ['text', 'lcov'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
