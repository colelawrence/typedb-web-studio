import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

function normalizeBaseUrl(value?: string) {
  if (!value || value === '/') {
    return '/'
  }

  let nextValue = value

  if (!nextValue.startsWith('/')) {
    nextValue = `/${nextValue}`
  }

  if (!nextValue.endsWith('/')) {
    nextValue = `${nextValue}/`
  }

  return nextValue
}

const base = normalizeBaseUrl(process.env.BASE_URL)

const config = defineConfig({
  // Support GitHub Pages subdirectory deployment
  // Set BASE_URL env var to "/repo-name/" for GitHub Pages
  base,
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
      router: {
        // Keep TanStack prerendering rooted at "/"
        // (GitHub Pages base path handling is done by Vite + runtime router)
        basepath: '/',
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
      // TypeDB WASM package
      '@typedb/embedded',
    ],
  },
  server: {
    fs: {
      // Allow serving files from the linked wasm-playground package
      // This is needed because the WASM module loads its .wasm file using import.meta.url
      allow: [
        // Project root
        '.',
        // Parent directory containing the linked wasm-playground
        path.resolve(__dirname, '..'),
      ],
    },
  },
  preview: {
    // Binding to IPv4 avoids sandbox issues with ::1 in CI/local sandboxes
    host: '127.0.0.1',
  },
})

export default config
