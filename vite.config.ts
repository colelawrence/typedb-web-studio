import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const config = defineConfig({
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
  // Required for LiveStore web workers
  worker: { format: 'es' },
  optimizeDeps: {
    // Exclude all LiveStore packages from pre-bundling to keep them together
    // The wa-sqlite package has WASM that needs special handling
    exclude: [
      '@livestore/wa-sqlite',
      '@livestore/adapter-web',
      '@livestore/livestore',
      '@livestore/react',
    ],
  },
})

export default config
