import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const webRoot = path.dirname(fileURLToPath(import.meta.url))
const app2Root = path.resolve(webRoot, '..')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(app2Root, 'shared'),
    },
  },
  server: {
    fs: {
      allow: [app2Root],
    },
  },
})
