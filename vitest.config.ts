import { defineConfig } from 'vitest/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
  ],
  server: {
    fs: {
      // Allow serving files from linked packages
      allow: ['.', path.resolve(__dirname, '..')],
    },
  },
  test: {
    // Browser mode for WASM testing
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }],
      headless: true,
    },
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
    // Setup files for test utilities
    setupFiles: ['./src/test/setup.ts'],
  },
  optimizeDeps: {
    exclude: [
      '@typedb/embedded',
      '@livestore/wa-sqlite',
      '@livestore/adapter-web',
      '@livestore/livestore',
      '@livestore/react',
      'typedb-wasm-playground',
    ],
    include: [
      'lucide-react',
    ],
  },
})
