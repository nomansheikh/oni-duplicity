import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, lazyPlugins } from 'vite-plus'

// Shown in the footer: the root package version (bumped by release-please) and the commit built.
const version: string = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
).version
let commit = 'dev'
try {
  commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
} catch {
  // Not a git checkout (e.g. a source tarball): keep 'dev'.
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(commit),
  },
  // Relative asset paths so the build works under a GitHub Pages subpath.
  base: './',
  plugins: lazyPlugins(() => [react(), tailwindcss()]),
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  worker: { format: 'es' },
  // The generator finds its .wasm with `new URL(..., import.meta.url)`, which pre-bundling breaks.
  optimizeDeps: { exclude: ['@onimaxxing/worldgen'] },
})
