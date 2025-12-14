import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
const config = defineConfig({
  plugins: [
    devtools(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      // SPA mode: LiveStore requires browser APIs (OPFS, Web Workers)
      // and we're deploying as a static single-page app
      spa: {
        enabled: true,
      },
    }),
    viteReact({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
  // Required for LiveStore web workers
  worker: { format: 'es' },
  optimizeDeps: {
    // Exclude packages with WASM from pre-bundling
    // These need special handling for WebAssembly modules
    exclude: [
      // LiveStore packages (uses wa-sqlite WASM)
      '@livestore/wa-sqlite',
      '@livestore/adapter-web',
      '@livestore/livestore',
      '@livestore/react',
      // TypeDB WASM packages
      'typedb-wasm-playground',
    ],
  },
})

export default config
