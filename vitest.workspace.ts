import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  // Browser tests (default) - for LiveStore, VM, TypeDB WASM, and component tests
  {
    extends: './vitest.config.ts',
    test: {
      name: 'browser',
      include: [
        'src/**/*.test.ts',
        // Include curriculum example tests (need TypeDB WASM)
        'src/curriculum/__tests__/all-examples.test.ts',
        // Exclude Node-only parser tests
        '!src/curriculum/__tests__/parser.test.ts',
      ],
    },
  },
  // Node tests - for curriculum parser (uses gray-matter which needs Node Buffer)
  {
    test: {
      name: 'node',
      environment: 'node',
      include: ['src/curriculum/__tests__/parser.test.ts'],
      globals: true,
    },
  },
])
